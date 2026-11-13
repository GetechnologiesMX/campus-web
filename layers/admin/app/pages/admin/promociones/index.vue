<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Promociones · Administración', robots: 'noindex' })

const { data: promotions, status, error, refresh } = await useFetch<Promotion[]>('/api/admin/promotions', { default: () => [] })

const search = ref('')
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return promotions.value.filter(p => !term || normalize(`${p.name} ${p.code ?? ''}`).includes(term))
})

function usesLabel(promotion: Promotion) {
  return promotion.max_uses == null ? String(promotion.report.uses) : `${promotion.report.uses} de ${promotion.max_uses}`
}
</script>

<template>
  <div class="section container">
    <header class="admin-header rise">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Promociones</h1>
        <p class="muted lead">Ofertas para todos y códigos de descuento, por tiempo limitado o con cupo.</p>
      </div>
      <NuxtLink to="/admin/promociones/nuevo" class="btn btn-primary">Nueva promoción</NuxtLink>
    </header>

    <div v-if="error" class="notice notice-error" role="alert">
      No pudimos cargar las promociones. {{ cmsErrors(error).general }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <template v-else>
      <div v-if="promotions.length" class="toolbar rise" style="--i: 1">
        <div class="search">
          <label for="search">Buscar</label>
          <input id="search" v-model="search" type="search" placeholder="Nombre o código" autocomplete="off">
        </div>
        <p class="muted count" aria-live="polite">
          {{ search.trim() ? `${filtered.length} de ${promotions.length}` : promotions.length }} promociones
        </p>
      </div>

      <div v-if="status === 'pending' && !promotions.length" class="skeleton" aria-busy="true" />

      <div v-else-if="filtered.length" class="table-wrap rise" style="--i: 2">
        <table>
          <thead>
            <tr>
              <th scope="col">Promoción</th>
              <th scope="col">Estado</th>
              <th scope="col" class="num">Descuento</th>
              <th scope="col">Vigencia</th>
              <th scope="col" class="num">Usos</th>
              <th scope="col" class="num">Descuento otorgado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="promotion in filtered" :key="promotion.id">
              <td>
                <NuxtLink :to="`/admin/promociones/${promotion.id}`" class="name">{{ promotion.name }}</NuxtLink>
                <span class="muted small">
                  <code v-if="promotion.code">{{ promotion.code }}</code><template v-else>Oferta</template>
                  · {{ promotionCourses(promotion) }}
                </span>
              </td>
              <td><span class="badge" :class="PROMOTION_STATE[promotion.state].badge">{{ PROMOTION_STATE[promotion.state].label }}</span></td>
              <td class="num">{{ discountLabel(promotion) }}</td>
              <td class="dates">{{ promotionDates(promotion) }}</td>
              <td class="num">{{ usesLabel(promotion) }}</td>
              <td class="num">{{ money(promotion.report.discounts) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="search.trim()" class="empty">
        <h2>Sin resultados</h2>
        <p class="muted">Ninguna promoción coincide con la búsqueda.</p>
        <button type="button" class="btn btn-secondary" @click="search = ''">Ver todas</button>
      </div>

      <div v-else class="empty">
        <h2>Todavía no hay promociones</h2>
        <p class="muted">Crea una oferta de lanzamiento o un código para una campaña.</p>
        <NuxtLink to="/admin/promociones/nuevo" class="btn btn-primary">Nueva promoción</NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
}

.search {
  flex: 1 1 320px;
  max-width: 420px;
}

.search label {
  font-size: 0.9rem;
}

.count {
  margin: 0;
  font-size: 0.9rem;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

th,
td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--ui-border);
  text-align: left;
  vertical-align: top;
}

tbody tr:last-child > td {
  border-bottom: 0;
}

thead th {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  white-space: nowrap;
}

.name {
  display: block;
  font-weight: 600;
  color: var(--ui-text-highlighted);
}

.small {
  display: block;
  max-width: 340px;
  font-size: 0.8rem;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dates {
  min-width: 180px;
  font-size: 0.85rem;
}

.skeleton {
  height: 240px;
  border-radius: var(--brand-radius);
  background: var(--ui-bg-muted);
}

.empty {
  padding: 48px 24px;
  text-align: center;
  border: 1px dashed var(--ui-border-accented);
  border-radius: var(--brand-radius);
}

.empty h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}

.empty p {
  margin: 0 auto 20px;
  max-width: 48ch;
}
</style>
