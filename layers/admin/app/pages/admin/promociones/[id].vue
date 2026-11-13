<script setup lang="ts">
/**
 * One promotion: its uses and what it brought in, links to share a code, the
 * orders that used it, and its details (edit, deactivate, delete if unused).
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const toast = useToast()
const origin = useRequestURL().origin
const id = Number(route.params.id)

const { data: promotion, error, refresh } = await useFetch<Promotion>(`/api/admin/promotions/${id}`, { key: `admin-promotion-${id}` })
if (error.value?.statusCode === 404 || (!promotion.value && !error.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Promoción no encontrada', fatal: true })
}
useSeoMeta({ title: () => `${promotion.value?.name ?? 'Promoción'} · Administración`, robots: 'noindex' })

const { data: orders, error: ordersError, refresh: refreshOrders } = await useFetch<CmsPage<AdminOrder>>('/api/admin/orders', {
  key: `admin-promotion-orders-${id}`, query: { promotion: id },
})

const state = computed(() => promotion.value && PROMOTION_STATE[promotion.value.state])
const r = computed(() => promotion.value!.report)

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: `${what} copiado`, color: 'success' })
  }
  catch {
    toast.add({ title: 'No se pudo copiar; selecciónalo y cópialo a mano.', color: 'warning' })
  }
}

// --- details ---------------------------------------------------------------------------

const editing = ref(false)
function saved(updated: Promotion) {
  promotion.value = updated
  editing.value = false
  toast.add({ title: 'Cambios guardados', color: 'success' })
}

const toggling = ref(false)
async function toggleActive() {
  const p = promotion.value!
  if (p.active && !window.confirm(`¿Desactivar «${p.name}»? Deja de aplicarse de inmediato.`)) return
  toggling.value = true
  try {
    promotion.value = await $fetch<Promotion>(`/api/admin/promotions/${id}`, { method: 'PATCH', body: { active: !p.active } })
    toast.add({ title: promotion.value.active ? 'Promoción activada' : 'Promoción desactivada', color: 'success' })
  }
  catch (e) {
    toast.add({ title: cmsErrors(e).general || 'No se pudo cambiar.', color: 'error' })
  }
  finally {
    toggling.value = false
  }
}

const deleting = ref(false)
async function remove() {
  if (!window.confirm('¿Borrar esta promoción? Nadie la ha usado, así que no afecta a nadie.')) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Promoción borrada', color: 'success' })
    await navigateTo('/admin/promociones')
  }
  catch (e) {
    toast.add({ title: cmsErrors(e).general || 'No se pudo borrar.', color: 'error' })
    deleting.value = false
  }
}

async function reload() {
  await Promise.all([refresh(), refreshOrders()])
}
</script>

<template>
  <div v-if="promotion" class="section container">
    <NuxtLink to="/admin/promociones" class="back-link rise">← Promociones</NuxtLink>
    <header class="admin-header rise" style="--i: 1">
      <div>
        <p class="eyebrow">
          {{ PROMOTION_KIND[promotion.kind].label }}
          <span v-if="state" class="badge" :class="state.badge">{{ state.label }}</span>
        </p>
        <h1>{{ promotion.name }}</h1>
        <p class="muted lead">
          {{ discountLabel(promotion) }} de descuento · {{ promotionCourses(promotion) }} · {{ promotionDates(promotion) }}
        </p>
      </div>
      <button v-if="promotion.code" type="button" class="code-chip" title="Copiar código" @click="copy(promotion.code, 'Código')">
        {{ promotion.code }}
      </button>
    </header>

    <!-- Report -->
    <section class="tiles rise" style="--i: 2" aria-label="Resumen">
      <StatTile label="Usos" :value="String(r.uses)"
                :hint="r.remaining != null ? `quedan ${r.remaining}` : 'sin límite'" />
      <StatTile label="Compras pagadas" :value="String(r.paid)" :hint="r.refunded ? `${r.refunded} reembolsadas` : ''" />
      <StatTile label="Ingresos" :value="money(r.revenue)" />
      <StatTile label="Descuento otorgado" :value="money(r.discounts)" />
    </section>

    <!-- Links to share a code -->
    <section v-if="promotion.code" class="admin-panel rise" style="--i: 3">
      <h2>Enlaces con el código</h2>
      <p class="muted panel-intro">
        Llevan al curso con el código ya aplicado: úsalos en anuncios, redes o correos.
        <template v-if="promotion.all_products">
          Aplica a todos los cursos: agrega <code>?codigo={{ promotion.code }}</code> al enlace de cualquiera.
        </template>
      </p>
      <ul v-if="!promotion.all_products" class="links">
        <li v-for="product in promotion.products_detail.filter(p => p.course_key)" :key="product.id">
          <span class="link-course">{{ product.title }}</span>
          <code class="link-url">{{ codeLink(origin, product.course_key!, promotion.code) }}</code>
          <button type="button" class="btn btn-secondary btn-small"
                  @click="copy(codeLink(origin, product.course_key!, promotion.code!), 'Enlace')">
            Copiar
          </button>
        </li>
      </ul>
    </section>

    <!-- Orders -->
    <section class="admin-panel rise" style="--i: 4">
      <div class="panel-head">
        <h2>Compras con esta promoción</h2>
        <button type="button" class="link-button" @click="reload">Actualizar</button>
      </div>
      <div v-if="ordersError" class="notice notice-error" role="alert">
        No pudimos cargar las compras. <button type="button" class="link-button" @click="refreshOrders()">Reintentar</button>
      </div>
      <p v-else-if="!orders?.results.length" class="muted">Nadie la ha usado todavía.</p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Quién</th>
              <th scope="col">Curso</th>
              <th scope="col" class="num">Pagó</th>
              <th scope="col" class="num">Descuento</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders.results" :key="order.id">
              <td class="date">{{ formatDateTime(order.paid_at ?? order.created) }}</td>
              <td>
                <span class="who">{{ order.username }}</span>
                <span class="muted small">{{ order.email }}</span>
              </td>
              <td>{{ order.course_title }}</td>
              <td class="num">{{ money(order.amount) }}</td>
              <td class="num">{{ money(order.discount) }}</td>
              <td><span class="pill" :class="`pay-${order.status}`">{{ ORDER_STATUS[order.status] }}</span></td>
            </tr>
          </tbody>
        </table>
        <p v-if="orders.count > orders.results.length" class="muted more">
          Mostrando {{ orders.results.length }} de {{ orders.count }}. Ve todas en Ventas.
        </p>
      </div>
    </section>

    <!-- Details -->
    <section class="details rise" style="--i: 5">
      <PromotionForm v-if="editing" :promotion="promotion" @saved="saved" @cancel="editing = false" />
      <div v-else class="admin-panel">
        <div class="panel-head">
          <h2>Datos de la promoción</h2>
          <div class="head-actions">
            <button type="button" class="btn btn-secondary btn-small" @click="editing = true">Editar</button>
            <button type="button" class="btn btn-secondary btn-small" :disabled="toggling" @click="toggleActive">
              {{ promotion.active ? 'Desactivar' : 'Activar' }}
            </button>
            <button v-if="!r.uses && !orders?.count" type="button" class="btn btn-danger btn-small" :disabled="deleting" @click="remove">
              Borrar
            </button>
          </div>
        </div>
        <dl class="facts">
          <div><dt>Descuento</dt><dd>{{ discountLabel(promotion) }}</dd></div>
          <div><dt>Usos en total</dt><dd>{{ promotion.max_uses ?? 'Sin límite' }}</dd></div>
          <div v-if="promotion.kind === 'code'"><dt>Usos por persona</dt><dd>{{ promotion.max_uses_per_user ?? 'Sin límite' }}</dd></div>
          <div><dt>Creada</dt><dd>{{ formatDateTime(promotion.created) }}</dd></div>
          <div class="wide"><dt>Cursos</dt><dd>{{ promotionCourses(promotion) }}</dd></div>
          <div class="wide"><dt>Vigencia</dt><dd>{{ promotionDates(promotion) }}</dd></div>
          <div v-if="promotion.notes" class="wide"><dt>Notas</dt><dd class="notes">{{ promotion.notes }}</dd></div>
        </dl>
      </div>
    </section>
  </div>
</template>

<style scoped>
.back-link {
  margin-bottom: 20px;
}

.eyebrow .badge {
  margin-left: 6px;
  vertical-align: 1px;
}

.code-chip {
  padding: 10px 16px;
  border: 1px dashed var(--ui-primary);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-color-primary-50);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--ui-color-primary-800);
  cursor: copy;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

@media (min-width: 900px) {
  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.links {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.links li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 12px;
  align-items: center;
}

.link-course {
  grid-column: 1 / -1;
  font-weight: 600;
}

.link-url {
  overflow: hidden;
  padding: 8px 10px;
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg-muted);
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--ui-border);
  text-align: left;
  vertical-align: middle;
}

tbody tr:last-child > td {
  border-bottom: 0;
}

thead th {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  white-space: nowrap;
}

.who {
  display: block;
  font-weight: 500;
}

.small {
  display: block;
  font-size: 0.8rem;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.date {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.more {
  margin: 0;
  padding: 10px 12px;
  font-size: 0.85rem;
}

.pill {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  background: var(--ui-color-neutral-100);
  color: var(--ui-color-neutral-700);
}

.pay-paid {
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-800);
}

.pay-refunded {
  background: var(--ui-color-warning-50);
  color: var(--ui-color-warning-800);
}

.details {
  margin-top: 24px;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px 24px;
  margin: 16px 0 0;
}

.facts .wide {
  grid-column: 1 / -1;
}

.facts dt {
  font-size: 0.82rem;
  color: var(--ui-text-muted);
}

.facts dd {
  margin: 2px 0 0;
  font-weight: 500;
}

.notes {
  white-space: pre-line;
}

code {
  font-size: 0.85em;
}
</style>
