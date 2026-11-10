<script setup lang="ts">
/**
 * /canjear/{course_key} — the link a company shares with its employees. It
 * also works for courses included in an agreement that aren't sold to the
 * public (and so have no /cursos page).
 */
const route = useRoute()
const id = route.params.id as string

// Only courses on sale (or archived) are in the public catalog: otherwise no title.
const { data: course } = await useFetch(`/api/courses/${encodeURIComponent(id)}`, {
  default: () => null,
})

useSeoMeta({ title: 'Canjea tu código', robots: 'noindex' })
</script>

<template>
  <div class="container redeem-page">
    <div class="redeem-card rise">
      <p class="eyebrow">Acceso por convenio</p>
      <h1>Canjea el código de tu empresa</h1>
      <p class="muted lead">
        <template v-if="course">Para el curso <strong>{{ course.name }}</strong>. </template>
        Escribe el código que te dio tu empresa; si aún no inicias sesión, te lo pediremos y volverás aquí.
      </p>
      <RedeemCode :course-id="id" standalone />
    </div>
  </div>
</template>

<style scoped>
.redeem-page {
  display: grid;
  place-items: start center;
  padding: 56px 0 80px;
}

.redeem-card {
  width: 100%;
  max-width: 480px;
  padding: 32px 24px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ui-primary);
}

h1 {
  margin: 0 0 12px;
  font-size: 1.6rem;
}

.lead {
  margin: 0 0 24px;
}
</style>
