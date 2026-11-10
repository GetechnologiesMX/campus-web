<script setup lang="ts">
/**
 * One agreement: its report (seats, codes generated / used / available), the
 * codes (generate, void, export) with who redeemed each and when, the links to
 * share with the employees, and its details. From "Quién los usó" a contador
 * can take the course away from someone (their seat is freed).
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const toast = useToast()
const origin = useRequestURL().origin
const id = Number(route.params.id)

const { data: agreement, error, refresh } = await useFetch<Agreement>(`/api/admin/agreements/${id}`, { key: `admin-agreement-${id}` })
if (error.value?.statusCode === 404 || (!agreement.value && !error.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Convenio no encontrado', fatal: true })
}
useSeoMeta({ title: () => `${agreement.value?.company ?? 'Convenio'} · Administración`, robots: 'noindex' })

const { data: codes, error: codesError, refresh: refreshCodes } = await useFetch<AgreementCode[]>(
  `/api/admin/agreements/${id}/codes`, { key: `admin-agreement-codes-${id}`, default: () => [] },
)

async function reload() {
  await Promise.all([refresh(), refreshCodes()])
}

const state = computed(() => agreement.value && agreementState(agreement.value))

// --- generate -------------------------------------------------------------------------

const count = ref<number | ''>(agreement.value?.report.free_seats || '')
watch(() => agreement.value?.report.free_seats, (free) => { count.value = free || '' })
const generating = ref(false)
const generateError = ref('')

async function generate() {
  generateError.value = ''
  if (typeof count.value !== 'number' || count.value < 1) {
    generateError.value = 'Indica cuántos códigos generar.'
    return
  }
  generating.value = true
  try {
    const created = await $fetch<AgreementCode[]>(`/api/admin/agreements/${id}/generate`, { method: 'POST', body: { count: count.value } })
    toast.add({ title: `${created.length} códigos generados`, description: 'Descarga el CSV para enviarlos a la empresa.', color: 'success' })
    await reload()
  }
  catch (e) {
    const errors = cmsErrors(e)
    generateError.value = errors.fields.count || errors.general
  }
  finally {
    generating.value = false
  }
}

// --- codes table ------------------------------------------------------------------------

const filter = ref<AgreementCodeStatus | 'all'>('all')
const filters = computed(() => [
  { value: 'all' as const, label: 'Todos', count: codes.value.length },
  ...(Object.keys(AGREEMENT_CODE_STATUS) as AgreementCodeStatus[]).map(value => ({
    value, label: AGREEMENT_CODE_STATUS[value], count: codes.value.filter(c => c.status === value).length,
  })),
])
const visible = computed(() => codes.value.filter(c => filter.value === 'all' || c.status === filter.value))
const redeemed = computed(() => codes.value.filter(c => c.redeemed_at)
  .sort((a, b) => b.redeemed_at!.localeCompare(a.redeemed_at!)))

const selected = ref<number[]>([])
const voidable = (code: AgreementCode) => code.status === 'available' || code.status === 'used'
const selectable = computed(() => visible.value.filter(voidable))
const allSelected = computed(() => !!selectable.value.length && selectable.value.every(c => selected.value.includes(c.id)))
function toggleAll() {
  selected.value = allSelected.value ? [] : selectable.value.map(c => c.id)
}
watch(filter, () => { selected.value = [] })

const usedSelected = computed(() => codes.value.filter(c => selected.value.includes(c.id) && c.status === 'used').length)
const voiding = ref(false)
async function voidSelected() {
  const n = selected.value.length
  const warning = usedSelected.value
    ? `\n\n${usedSelected.value} ya se usaron: quien los canjeó conserva el curso.`
    : ''
  if (!n || !window.confirm(`¿Anular ${n} ${n === 1 ? 'código' : 'códigos'}? No se podrán canjear.${warning}`)) return
  voiding.value = true
  try {
    const { voided } = await $fetch<{ voided: number }>(`/api/admin/agreements/${id}/void`, { method: 'POST', body: { ids: selected.value } })
    toast.add({ title: `${voided} ${voided === 1 ? 'código anulado' : 'códigos anulados'}`, color: 'success' })
    selected.value = []
    await reload()
  }
  catch (e) {
    toast.add({ title: cmsErrors(e).general || 'No se pudieron anular.', color: 'error' })
  }
  finally {
    voiding.value = false
  }
}

// --- remove access --------------------------------------------------------------------

const revoking = ref<number | null>(null)
async function revoke(code: AgreementCode) {
  const question = `¿Quitarle el curso "${code.course_title}" a ${code.username}?\n\n`
    + 'Pierde el acceso de inmediato y su lugar queda libre para generar otro código. '
    + 'Si fue un error, tendrás que darle un código nuevo.'
  if (!window.confirm(question)) return
  revoking.value = code.id
  try {
    const { revoked, pending } = await $fetch<{ revoked: number, pending: number }>(
      `/api/admin/agreements/${id}/revoke`, { method: 'POST', body: { ids: [code.id] } },
    )
    if (!revoked) toast.add({ title: 'Ya no tenía acceso por este código.', color: 'warning' })
    else if (pending) {
      toast.add({
        title: `Se le quitó el acceso a ${code.username} en Campus`,
        description: 'Open edX no respondió; se reintentará solo. También puedes reintentar desde Ventas.',
        color: 'warning',
      })
    }
    else toast.add({ title: `Se le quitó el acceso a ${code.username}`, description: 'Su lugar quedó libre.', color: 'success' })
    await reload()
  }
  catch (e) {
    toast.add({ title: cmsErrors(e).general || 'No se pudo quitar el acceso.', color: 'error' })
  }
  finally {
    revoking.value = null
  }
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: `${what} copiado`, color: 'success' })
  }
  catch {
    toast.add({ title: 'No se pudo copiar; selecciónalo y cópialo a mano.', color: 'warning' })
  }
}

// --- details --------------------------------------------------------------------------

const editing = ref(false)
function saved(updated: Agreement) {
  agreement.value = updated
  editing.value = false
  toast.add({ title: 'Cambios guardados', color: 'success' })
}

const deleting = ref(false)
async function remove() {
  if (!window.confirm('¿Borrar este convenio? No tiene códigos, así que no afecta a nadie.')) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/agreements/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Convenio borrado', color: 'success' })
    await navigateTo('/admin/convenios')
  }
  catch (e) {
    toast.add({ title: cmsErrors(e).general || 'No se pudo borrar.', color: 'error' })
    deleting.value = false
  }
}
</script>

<template>
  <div v-if="agreement" class="section container">
    <NuxtLink to="/admin/convenios" class="back-link rise">← Convenios</NuxtLink>
    <header class="admin-header rise" style="--i: 1">
      <div>
        <p class="eyebrow">
          Convenio <span v-if="state" class="badge" :class="state.badge">{{ state.label }}</span>
        </p>
        <h1>{{ agreement.company }}</h1>
        <p class="muted lead">
          {{ agreement.contact_email }} · se puede canjear hasta el {{ shortDay(agreement.expires_at, true) }}
        </p>
      </div>
      <a :href="`/api/admin/agreements/${id}/export`" class="btn btn-secondary" download>Exportar CSV</a>
    </header>

    <div v-if="!agreement.is_current" class="notice notice-warning rise" role="status">
      {{ agreement.active ? 'Este convenio ya venció' : 'Este convenio está inactivo' }}: nadie puede canjear sus códigos.
      Quienes ya los canjearon conservan el curso, salvo que les quites el acceso.
    </div>

    <!-- Report -->
    <section class="tiles rise" style="--i: 2" aria-label="Resumen">
      <StatTile label="Lugares comprados" :value="String(agreement.report.seats)" />
      <StatTile label="Códigos generados" :value="String(agreement.report.generated)"
                :hint="agreement.report.void ? `${agreement.report.void} anulados` : ''" />
      <StatTile label="Usados" :value="String(agreement.report.used)"
                :hint="agreement.report.revoked ? `${agreement.report.revoked} con acceso retirado` : ''" />
      <StatTile label="Disponibles" :value="String(agreement.report.available)" />
    </section>

    <!-- Generate -->
    <section class="admin-panel rise" style="--i: 3">
      <h2>Generar códigos</h2>
      <p class="muted panel-intro">
        Formato <code>{{ agreement.code_prefix }}-XXXX-XXXX</code>, sin caracteres que se confundan. Quedan
        <strong>{{ agreement.report.free_seats }}</strong> {{ agreement.report.free_seats === 1 ? 'lugar' : 'lugares' }} sin código
        (los anulados sin usar y los de quienes perdieron el acceso no cuentan, así puedes reponerlos).
      </p>
      <form v-if="agreement.report.free_seats" class="generate" novalidate @submit.prevent="generate">
        <div class="field">
          <label for="generate-count">¿Cuántos?</label>
          <input id="generate-count" v-model.number="count" type="number" min="1" :max="agreement.report.free_seats" step="1"
                 inputmode="numeric" :aria-invalid="!!generateError" aria-describedby="generate-error">
        </div>
        <button type="submit" class="btn btn-primary" :disabled="generating">{{ generating ? 'Generando…' : 'Generar' }}</button>
      </form>
      <p v-else class="muted">Ya hay un código por cada lugar. Para generar más, aumenta los lugares o anula alguno sin usar.</p>
      <p v-if="generateError" id="generate-error" class="field-hint error" role="alert">{{ generateError }}</p>
    </section>

    <!-- Links to share -->
    <section class="admin-panel rise" style="--i: 3">
      <h2>Enlace para los empleados</h2>
      <p class="muted panel-intro">
        Envíalo junto con su código. También pueden canjearlo desde la página del curso en "¿Tienes un código de tu empresa?".
      </p>
      <ul class="links">
        <li v-for="product in agreement.products_detail" :key="product.id">
          <span class="link-course">{{ product.title }}</span>
          <code class="link-url">{{ redeemUrl(origin, product.course_key) }}</code>
          <button type="button" class="btn btn-secondary btn-small" @click="copy(redeemUrl(origin, product.course_key), 'Enlace')">Copiar</button>
        </li>
      </ul>
    </section>

    <!-- Codes -->
    <section class="admin-panel rise" style="--i: 4">
      <div class="panel-head">
        <div>
          <h2>Códigos</h2>
          <p class="muted panel-intro">{{ NO_REVOKE_NOTE }}</p>
        </div>
        <button v-if="selected.length" type="button" class="btn btn-danger btn-small" :disabled="voiding" @click="voidSelected">
          {{ voiding ? 'Anulando…' : `Anular ${selected.length}` }}
        </button>
      </div>

      <div v-if="codesError" class="notice notice-error" role="alert">
        No pudimos cargar los códigos. <button type="button" class="link-button" @click="refreshCodes()">Reintentar</button>
      </div>
      <p v-else-if="!codes.length" class="muted">Todavía no hay códigos. Genéralos arriba.</p>
      <template v-else>
        <div class="filters" role="group" aria-label="Filtrar por estado">
          <button v-for="option in filters" :key="option.value" type="button" class="chip"
                  :aria-pressed="filter === option.value" @click="filter = option.value">
            {{ option.label }} <span class="chip-count">{{ option.count }}</span>
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col" class="check-col">
                  <input type="checkbox" :checked="allSelected" :disabled="!selectable.length"
                         aria-label="Seleccionar todos los que se pueden anular" @change="toggleAll">
                </th>
                <th scope="col">Código</th>
                <th scope="col">Estado</th>
                <th scope="col">Lo usó</th>
                <th scope="col">Curso</th>
                <th scope="col">Fecha de canje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="code in visible" :key="code.id" :class="{ voided: code.status === 'void' || code.status === 'revoked' }">
                <td class="check-col">
                  <input v-if="voidable(code)" v-model="selected" type="checkbox" :value="code.id" :aria-label="`Seleccionar ${code.code}`">
                </td>
                <td>
                  <button type="button" class="code" title="Copiar" @click="copy(code.code, 'Código')">{{ code.code }}</button>
                </td>
                <td><span class="pill" :class="`code-${code.status}`">{{ AGREEMENT_CODE_STATUS[code.status] }}</span></td>
                <td>
                  <template v-if="code.username">
                    <span class="who">{{ code.username }}</span>
                    <span class="muted small">{{ code.email }}</span>
                  </template>
                  <span v-else class="muted">—</span>
                </td>
                <td class="course">{{ code.course_title ?? '—' }}</td>
                <td class="date">{{ code.redeemed_at ? formatDateTime(code.redeemed_at) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <!-- Who used them -->
    <section v-if="redeemed.length" class="admin-panel rise" style="--i: 5">
      <h2>Quién los usó</h2>
      <p class="muted panel-intro">
        {{ agreement.report.used }} de {{ agreement.report.seats }} lugares con acceso, del más reciente al más antiguo.
        «Quitar acceso» le quita el curso a esa persona y libera su lugar.
      </p>
      <ol class="redeemed">
        <li v-for="code in redeemed" :key="code.id" :class="{ revoked: code.status === 'revoked' }">
          <span class="who">{{ code.username }}</span>
          <span class="muted">{{ code.email }}</span>
          <span>{{ code.course_title }}</span>
          <span class="date muted">{{ formatDateTime(code.redeemed_at!) }}</span>
          <span class="access-col">
            <template v-if="code.status === 'revoked'">
              <span class="pill code-revoked">Acceso retirado</span>
              <span class="muted small">
                {{ code.revoked_at ? formatDateTime(code.revoked_at) : '' }}{{ code.revoked_by ? ` · ${code.revoked_by}` : '' }}
              </span>
              <span v-if="code.access === 'error'" class="small error-text">
                Open edX aún no lo aplica; se reintentará.
              </span>
            </template>
            <button v-else type="button" class="btn btn-danger btn-small" :disabled="revoking === code.id" @click="revoke(code)">
              {{ revoking === code.id ? 'Quitando…' : 'Quitar acceso' }}
            </button>
          </span>
        </li>
      </ol>
    </section>

    <!-- Details -->
    <section class="details rise" style="--i: 6">
      <AgreementForm v-if="editing" :agreement="agreement" @saved="saved" @cancel="editing = false" />
      <div v-else class="admin-panel">
        <div class="panel-head">
          <h2>Datos del convenio</h2>
          <div class="head-actions">
            <button type="button" class="btn btn-secondary btn-small" @click="editing = true">Editar</button>
            <button v-if="!agreement.report.generated" type="button" class="btn btn-danger btn-small" :disabled="deleting" @click="remove">
              Borrar
            </button>
          </div>
        </div>
        <dl class="facts">
          <div><dt>Cursos</dt><dd>{{ agreement.products_detail.map(p => p.title).join(', ') }}</dd></div>
          <div><dt>Prefijo</dt><dd><code>{{ agreement.code_prefix }}</code></dd></div>
          <div><dt>Estado</dt><dd>{{ agreement.active ? 'Activo' : 'Inactivo' }}</dd></div>
          <div><dt>Creado</dt><dd>{{ formatDateTime(agreement.created) }}</dd></div>
          <div v-if="agreement.notes" class="wide"><dt>Notas</dt><dd class="notes">{{ agreement.notes }}</dd></div>
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

.notice {
  margin-bottom: 20px;
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

.generate {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.generate .field {
  width: 140px;
}

.field-hint.error {
  color: var(--ui-color-error-600);
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

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 13px;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  background: var(--ui-text-highlighted);
  border-color: var(--ui-text-highlighted);
  color: var(--ui-text-inverted);
}

.chip-count {
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
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

.check-col {
  width: 36px;
}

.check-col input {
  width: auto;
  accent-color: var(--ui-primary);
}

tr.voided .code {
  text-decoration: line-through;
  color: var(--ui-text-muted);
}

.code {
  padding: 0;
  border: 0;
  background: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
  letter-spacing: 0.03em;
  white-space: nowrap;
  color: var(--ui-text-highlighted);
  cursor: copy;
}

.who {
  display: block;
  font-weight: 500;
}

.small {
  display: block;
  font-size: 0.8rem;
}

.course {
  min-width: 140px;
}

.date {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.pill {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
}

.code-available {
  background: var(--ui-color-primary-50);
  color: var(--ui-color-primary-800);
}

.code-used {
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-800);
}

.code-void {
  background: var(--ui-color-neutral-100);
  color: var(--ui-color-neutral-700);
}

.code-revoked {
  background: var(--ui-color-warning-50);
  color: var(--ui-color-warning-800);
}

.redeemed {
  margin: 0;
  padding: 0;
  list-style: none;
}

.redeemed li {
  display: grid;
  align-items: center;
  gap: 2px 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--ui-border);
  font-size: 0.9rem;
}

.redeemed li:last-child {
  border-bottom: 0;
}

@media (min-width: 768px) {
  .redeemed li {
    grid-template-columns: 160px minmax(0, 1fr) minmax(0, 1fr) auto 150px;
  }
}

.redeemed li.revoked .who {
  text-decoration: line-through;
  color: var(--ui-text-muted);
}

.access-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

@media (min-width: 768px) {
  .access-col {
    align-items: flex-end;
    text-align: right;
  }
}

.error-text {
  color: var(--ui-color-error-700);
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
