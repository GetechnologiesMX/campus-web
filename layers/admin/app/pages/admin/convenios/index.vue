<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Convenios · Administración', robots: 'noindex' })

const { data: agreements, status, error, refresh } = await useFetch<Agreement[]>('/api/admin/agreements', { default: () => [] })

const search = ref('')
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return agreements.value.filter(a => !term || normalize(`${a.company} ${a.contact_email} ${a.code_prefix}`).includes(term))
})
</script>

<template>
  <div class="section container">
    <header class="admin-header rise">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Convenios</h1>
        <p class="muted lead">Empresas que compran lugares para sus empleados: cada uno entra al curso con un código, sin pagar en línea.</p>
      </div>
      <NuxtLink to="/admin/convenios/nuevo" class="btn btn-primary">Nuevo convenio</NuxtLink>
    </header>

    <div v-if="error" class="notice notice-error" role="alert">
      No pudimos cargar los convenios. {{ cmsErrors(error).general }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <template v-else>
      <div v-if="agreements.length" class="toolbar rise" style="--i: 1">
        <div class="search">
          <label for="search">Buscar</label>
          <input id="search" v-model="search" type="search" placeholder="Empresa, correo o prefijo" autocomplete="off">
        </div>
        <p class="muted count" aria-live="polite">
          {{ search.trim() ? `${filtered.length} de ${agreements.length}` : agreements.length }} convenios
        </p>
      </div>

      <div v-if="status === 'pending' && !agreements.length" class="skeleton" aria-busy="true" />

      <div v-else-if="filtered.length" class="table-wrap rise" style="--i: 2">
        <table>
          <thead>
            <tr>
              <th scope="col">Empresa</th>
              <th scope="col">Estado</th>
              <th scope="col" class="num">Lugares</th>
              <th scope="col" class="num">Generados</th>
              <th scope="col" class="num">Usados</th>
              <th scope="col" class="num">Disponibles</th>
              <th scope="col">Vence</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="agreement in filtered" :key="agreement.id">
              <td>
                <NuxtLink :to="`/admin/convenios/${agreement.id}`" class="company">{{ agreement.company }}</NuxtLink>
                <span class="muted small">{{ agreement.products_detail.map(p => p.title).join(', ') }}</span>
              </td>
              <td><span class="badge" :class="agreementState(agreement).badge">{{ agreementState(agreement).label }}</span></td>
              <td class="num">{{ agreement.report.seats }}</td>
              <td class="num">{{ agreement.report.generated }}</td>
              <td class="num">{{ agreement.report.used }}</td>
              <td class="num">{{ agreement.report.available }}</td>
              <td class="date">{{ shortDay(agreement.expires_at, true) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="search.trim()" class="empty">
        <h2>Sin resultados</h2>
        <p class="muted">Ningún convenio coincide con la búsqueda.</p>
        <button type="button" class="btn btn-secondary" @click="search = ''">Ver todos</button>
      </div>

      <div v-else class="empty">
        <h2>Todavía no hay convenios</h2>
        <p class="muted">Registra el primero cuando una empresa compre lugares para sus empleados.</p>
        <NuxtLink to="/admin/convenios/nuevo" class="btn btn-primary">Nuevo convenio</NuxtLink>
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

.company {
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
}

.date {
  white-space: nowrap;
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
