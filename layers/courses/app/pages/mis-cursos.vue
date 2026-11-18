<script setup lang="ts">
useSeoMeta({ title: 'Mis cursos', robots: 'noindex' })

const user = useEdxUser()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()

// Only for logged-in users: Open edX logs them in and sends them back here.
if (!user.value) {
  await navigateTo(`${config.public.lmsUrl}/login?next=${encodeURIComponent(requestUrl.href)}`, { external: true })
}

const { data: courses, status, error, refresh } = await useFetch('/api/me/courses', {
  immediate: !!user.value,
  default: () => [] as MyCourse[],
})

// A session that expired on the LMS side: log in again.
watch(error, (value) => {
  if (value?.statusCode === 401 && import.meta.client) {
    window.location.href = `${config.public.lmsUrl}/login?next=${encodeURIComponent(window.location.href)}`
  }
}, { immediate: true })

type Filter = 'all' | MyCourseStatus
const filter = ref<Filter>('all')
const search = ref('')

const withStatus = computed(() => courses.value.map(course => ({ course, status: myCourseStatus(course) })))
const counts = computed(() => {
  const result = { all: withStatus.value.length, active: 0, upcoming: 0, ended: 0 }
  for (const { status } of withStatus.value) result[status]++
  return result
})
const filterOptions = computed(() => ([
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'En curso' },
  { value: 'upcoming', label: 'Por iniciar' },
  { value: 'ended', label: 'Terminados' },
] as const).filter(option => option.value === 'all' || counts.value[option.value] > 0))

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return withStatus.value
    .filter(({ course, status }) => {
      if (filter.value !== 'all' && status !== filter.value) return false
      return !term || normalize(`${course.name} ${course.org} ${course.number}`).includes(term)
    })
    .map(({ course }) => course)
})

const isFiltering = computed(() => !!search.value.trim() || filter.value !== 'all')
const purchasedCount = computed(() => courses.value.filter(course => course.purchased).length)

function resetFilters() {
  search.value = ''
  filter.value = 'all'
}
</script>

<template>
  <div class="section container">
    <header class="header rise">
      <p class="eyebrow">Tu aprendizaje</p>
      <h1>Mis cursos</h1>
      <p class="muted lead">
        Los cursos que compraste y en los que estás inscrito. Entra cuando quieras: el acceso es de por vida.
      </p>
    </header>

    <div v-if="error && error.statusCode !== 401" class="notice notice-warning rise" role="alert">
      No pudimos cargar tus cursos. {{ error.statusMessage }}
      <button type="button" class="retry" @click="() => refresh()">Reintentar</button>
    </div>

    <template v-else>
      <div v-if="counts.all" class="toolbar rise" style="--i: 1">
        <div class="search">
          <label for="search">Buscar en mis cursos</label>
          <input id="search" v-model="search" type="search" placeholder="Nombre u organización" autocomplete="off">
        </div>
        <div class="filters" role="group" aria-label="Filtrar por estado">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="chip"
            :aria-pressed="filter === option.value"
            @click="filter = option.value"
          >
            {{ option.label }}
            <span class="chip-count">{{ counts[option.value] }}</span>
          </button>
        </div>
      </div>

      <p v-if="counts.all" class="count muted" aria-live="polite">
        <template v-if="isFiltering">{{ filtered.length }} de {{ counts.all }} {{ counts.all === 1 ? 'curso' : 'cursos' }}</template>
        <template v-else>
          {{ counts.all }} {{ counts.all === 1 ? 'curso' : 'cursos' }}
          <template v-if="purchasedCount">· {{ purchasedCount }} {{ purchasedCount === 1 ? 'adquirido' : 'adquiridos' }}</template>
        </template>
      </p>

      <div v-if="status === 'pending'" class="card-grid" aria-busy="true">
        <div v-for="n in 3" :key="n" class="skeleton" />
      </div>

      <div v-else-if="filtered.length" class="card-grid">
        <MyCourseCard
          v-for="(course, i) in filtered"
          :key="course.id"
          :course="course"
          class="rise"
          :style="{ '--i': Math.min(i, 6) + 2 }"
        />
      </div>

      <div v-else-if="isFiltering" class="empty">
        <h2>Sin resultados</h2>
        <p class="muted">Ninguno de tus cursos coincide con esos filtros.</p>
        <button type="button" class="btn btn-secondary" @click="resetFilters">Quitar filtros</button>
      </div>

      <div v-else-if="user" class="empty rise" style="--i: 1">
        <h2>Aún no tienes cursos</h2>
        <p class="muted">Cuando compres un curso o te inscriban en uno, aparecerá aquí para que entres directo.</p>
        <NuxtLink to="/cursos" class="btn btn-primary">Explorar cursos</NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: 32px;
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.lead {
  margin: 0;
  font-size: 1.1rem;
  max-width: 56ch;
}

.toolbar {
  display: grid;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ui-border);
}

@media (min-width: 768px) {
  .toolbar {
    grid-template-columns: minmax(0, 420px) auto;
    justify-content: space-between;
    align-items: end;
  }
}

.search label {
  font-size: 0.9rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.chip:hover {
  border-color: var(--ui-text-highlighted);
}

.chip[aria-pressed='true'] {
  background: var(--ui-text-highlighted);
  border-color: var(--ui-text-highlighted);
  color: var(--ui-text-inverted);
}

.chip:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.chip-count {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

.count {
  margin: 16px 0 20px;
  font-size: 0.9rem;
}

.card-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
}

.skeleton {
  aspect-ratio: 4 / 5;
  border-radius: var(--brand-radius);
  background: linear-gradient(100deg, var(--ui-border) 30%, var(--ui-bg) 50%, var(--ui-border) 70%);
  background-size: 300% 100%;
}

@media (prefers-reduced-motion: no-preference) {
  .skeleton {
    animation: shimmer 1.4s ease-in-out infinite;
  }
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}

.empty {
  padding: 56px 24px;
  border: 1px dashed var(--ui-border);
  border-radius: var(--brand-radius);
  text-align: center;
}

.empty h2 {
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.empty p {
  margin: 0 auto 24px;
  max-width: 44ch;
}

.retry {
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
