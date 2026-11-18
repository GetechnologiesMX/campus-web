<script setup lang="ts">
const props = defineProps<{ course: MyCourse }>()
const config = useRuntimeConfig()

const status = computed(() => myCourseStatus(props.course))
const courseUrl = computed(() => learningCourseUrl(config.public.learningMfeUrl, props.course.id))

const statusText = computed(() => {
  const { start, end } = props.course
  if (status.value === 'upcoming') return `Comienza el ${formatDay(start!)}`
  if (status.value === 'ended') return `Terminó el ${formatDay(end!)}`
  return end ? `Disponible hasta el ${formatDay(end)}` : 'Disponible'
})
const actionLabel = computed(() => (status.value === 'ended' ? 'Repasar el curso' : 'Ir al curso'))
</script>

<template>
  <article class="my-course" :class="status">
    <a :href="courseUrl" class="cover" tabindex="-1" aria-hidden="true">
      <img v-if="course.image" :src="course.image" alt="" loading="lazy">
      <span v-else class="cover-fallback">{{ course.org }}</span>
      <span class="access-tag" :class="{ given: !course.purchased }">
        {{ course.purchased ? 'Adquirido' : 'Inscrito' }}
      </span>
    </a>

    <div class="body">
      <p class="org">{{ course.org }} · {{ course.number }}</p>
      <h3><a :href="courseUrl">{{ course.name }}</a></h3>

      <p class="status">
        <span class="dot" aria-hidden="true" />
        {{ statusText }}
      </p>

      <div class="footer">
        <a :href="courseUrl" class="btn btn-primary">{{ actionLabel }}</a>
        <NuxtLink v-if="course.inCatalog" :to="coursePath(course.id)" class="details">Detalles</NuxtLink>
        <span class="pacing">{{ course.pacing === 'self' ? 'A tu ritmo' : 'Con fechas' }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.my-course {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  overflow: hidden;
  transition: box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
}

.my-course:hover {
  border-color: color-mix(in srgb, var(--ui-primary) 25%, transparent);
  box-shadow: 0 2px 4px color-mix(in srgb, var(--ui-primary) 6%, transparent), 0 12px 32px color-mix(in srgb, var(--ui-primary) 10%, transparent);
}

.cover {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, var(--ui-color-primary-100), var(--ui-color-primary-50));
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.my-course:hover .cover img {
  transform: scale(1.03);
}

.ended .cover img {
  filter: saturate(0.6);
}

.cover-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--ui-primary) 35%, transparent);
}

.access-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ui-color-primary-700);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
}

.access-tag.given {
  background: var(--ui-bg);
  color: var(--ui-text-highlighted);
  box-shadow: 0 0 0 1px var(--ui-border);
}

.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px 22px 22px;
}

.org {
  margin: 0 0 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ui-text-muted);
}

h3 {
  margin: 0 0 12px;
  font-size: 1.12rem;
  letter-spacing: -0.01em;
}

h3 a {
  color: inherit;
  text-decoration: none;
}

h3 a:hover {
  color: var(--brand-link);
  text-decoration: underline;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 0.92rem;
  color: var(--ui-text-muted);
}

.dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ui-color-success-500);
}

.upcoming .dot {
  background: var(--ui-color-primary-500);
}

.ended .dot {
  background: var(--ui-color-neutral-400);
}

.footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ui-border);
}

.footer .btn {
  padding: 9px 18px;
}

.details {
  font-size: 0.92rem;
  font-weight: 500;
}

.pacing {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--ui-color-primary-100);
  color: var(--brand-text);
  font-size: 0.8rem;
  font-weight: 600;
}
</style>
