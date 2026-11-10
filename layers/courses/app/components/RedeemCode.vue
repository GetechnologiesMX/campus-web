<script setup lang="ts">
/**
 * "¿Tienes un código de tu empresa?": redeems a company agreement code for
 * this course. Anonymous visitors go through the LMS login and come back with
 * ?canjear=1; the code they typed is kept in sessionStorage meanwhile and the
 * redeem continues on its own. On success we go straight into the course.
 */
const props = defineProps<{
  courseId: string
  // Shown open, without the link (the /canjear page).
  standalone?: boolean
}>()

const route = useRoute()
const config = useRuntimeConfig()
const user = useEdxUser()

const storageKey = `campus:redeem:${props.courseId}`
const courseUrl = `${config.public.learningMfeUrl}/course/${encodeURIComponent(props.courseId)}/home`

const open = ref(!!props.standalone)
const code = ref('')
const error = ref('')
const busy = ref(false)
const done = ref(false)
const enrolled = ref(false)

function remember(value: string) {
  try {
    sessionStorage.setItem(storageKey, value)
  }
  catch { /* private mode: they'll type it again */ }
}

function recall(): string {
  try {
    const value = sessionStorage.getItem(storageKey) ?? ''
    sessionStorage.removeItem(storageKey)
    return value
  }
  catch {
    return ''
  }
}

function goToLogin() {
  remember(code.value.trim())
  const back = new URL(window.location.href)
  back.searchParams.set('canjear', '1')
  window.location.href = `${config.public.lmsUrl}/login?next=${encodeURIComponent(back.href)}`
}

async function redeem() {
  error.value = ''
  if (!code.value.trim()) {
    error.value = 'Escribe tu código.'
    return
  }
  if (!user.value) {
    goToLogin()
    return
  }
  busy.value = true
  try {
    await $fetch(`/api/courses/${encodeURIComponent(props.courseId)}/redeem`, {
      method: 'POST',
      body: { code: code.value },
    })
    done.value = true
    window.location.href = courseUrl
  }
  catch (err) {
    const status = (err as { status?: number }).status
    const data = (err as { data?: { code?: string, detail?: string } }).data
    if (status === 401) {
      goToLogin()
      return
    }
    enrolled.value = data?.code === 'already_enrolled'
    error.value = data?.detail ?? 'No se pudo canjear el código. Intenta de nuevo en un momento.'
  }
  finally {
    busy.value = false
  }
}

onMounted(() => {
  if (route.query.canjear !== '1') return
  open.value = true
  const saved = recall()
  if (saved) code.value = saved
  if (saved && user.value) redeem()
})
</script>

<template>
  <div class="redeem" :class="{ standalone }">
    <button v-if="!standalone && !open" type="button" class="redeem-toggle" @click="open = true">
      ¿Tienes un código de tu empresa?
    </button>
    <form v-else class="redeem-form" @submit.prevent="redeem">
      <label :for="`redeem-${courseId}`">Código de tu empresa</label>
      <div class="redeem-row">
        <input
          :id="`redeem-${courseId}`"
          v-model="code"
          type="text"
          placeholder="ACME-7K3P-Q9XD"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          maxlength="64"
          :disabled="busy || done"
          :aria-invalid="!!error"
          :aria-describedby="error ? `redeem-error-${courseId}` : undefined"
        >
        <button type="submit" class="btn btn-secondary" :disabled="busy || done">
          {{ busy || done ? 'Canjeando…' : 'Canjear' }}
        </button>
      </div>
      <p v-if="error" :id="`redeem-error-${courseId}`" class="redeem-error" role="alert">
        {{ error }}
        <a v-if="enrolled" :href="courseUrl">Ir al curso</a>
      </p>
      <p v-else-if="done" class="redeem-hint" role="status">¡Listo! Te llevamos al curso…</p>
      <p v-else-if="!user" class="redeem-hint">Te pediremos iniciar sesión y volverás aquí para terminar.</p>
    </form>
  </div>
</template>

<style scoped>
.redeem {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ui-border);
}

.redeem.standalone {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.redeem-toggle {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ui-primary);
  text-align: center;
  cursor: pointer;
}

.redeem-toggle:hover {
  text-decoration: underline;
}

.redeem-form label {
  font-size: 0.9rem;
}

.redeem-row {
  display: flex;
  gap: 8px;
}

.redeem-row input {
  min-width: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}

.redeem-row .btn {
  flex-shrink: 0;
  padding-left: 16px;
  padding-right: 16px;
}

.redeem-row .btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.redeem-error,
.redeem-hint {
  margin: 8px 0 0;
  font-size: 0.85rem;
}

.redeem-error {
  color: var(--ui-color-error-700);
}

.redeem-hint {
  color: var(--ui-text-muted);
}
</style>
