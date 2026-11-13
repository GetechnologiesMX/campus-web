<script setup lang="ts">
/** Create or edit a promotion (offer or discount code). Emits the saved promotion. */
const props = defineProps<{ promotion?: Promotion | null }>()
const emit = defineEmits<{ saved: [promotion: Promotion], cancel: [] }>()

const editing = computed(() => !!props.promotion)
// Once used, what it gives can't change: the orders keep what they got, but
// the report would mix two different promotions.
const used = computed(() => !!props.promotion?.report.uses)

// Any course that isn't archived: one not on sale yet can be prepared ahead.
const { data: products, error: productsError } = useFetch<Product[]>('/api/admin/products', {
  key: 'admin-promotion-products', server: false, default: () => [],
})
const choices = computed(() => products.value.filter(p => p.status !== 'archived' && p.course_key))

function initial() {
  const p = props.promotion
  return {
    name: p?.name ?? '',
    kind: p?.kind ?? ('code' as PromotionKind),
    code: p?.code ?? '',
    discount_type: p?.discount_type ?? ('percent' as DiscountType),
    value: p ? Number(p.value) : ('' as number | ''),
    all_products: p?.all_products ?? false,
    products: [...(p?.products ?? [])],
    starts_at: toLocalInput(p?.starts_at ?? null),
    ends_at: toLocalInput(p?.ends_at ?? null),
    max_uses: p?.max_uses ?? ('' as number | ''),
    max_uses_per_user: p ? (p.max_uses_per_user ?? '') : (1 as number | ''),
    active: p?.active ?? true,
    notes: p?.notes ?? '',
  }
}
const form = reactive(initial())
watch(() => props.promotion, () => Object.assign(form, initial()))

const isCode = computed(() => form.kind === 'code')
const maxPercent = computed(() => isCode.value ? 100 : 99)

const positiveInt = (v: number | '') => v === '' || (typeof v === 'number' && Number.isInteger(v) && v >= 1)
const invalid = computed(() => ({
  name: !form.name.trim(),
  code: isCode.value && !PROMOTION_CODE.test(form.code.trim().toUpperCase()),
  value: typeof form.value !== 'number' || form.value <= 0
    || (form.discount_type === 'percent' && form.value > maxPercent.value),
  products: !form.all_products && !form.products.length,
  ends_at: !!form.starts_at && !!form.ends_at && form.ends_at <= form.starts_at,
  max_uses: !positiveInt(form.max_uses),
  max_uses_per_user: isCode.value && !positiveInt(form.max_uses_per_user),
}))

const submitted = ref(false)
const saving = ref(false)
const errors = ref<CmsErrors>()
const fieldError = (name: string) => errors.value?.fields[name]
const bad = (name: keyof typeof invalid.value) => (submitted.value && invalid.value[name]) || !!fieldError(name)

const valueHint = computed(() => {
  if (form.discount_type === 'amount') return 'Pesos que se descuentan del precio de lista.'
  return isCode.value
    ? 'Del 1 al 100. Un código del 100% inscribe sin pagar.'
    : 'Del 1 al 99: una oferta no regala el curso (para eso, un código del 100%).'
})

async function save() {
  submitted.value = true
  errors.value = undefined
  const firstInvalid = Object.entries(invalid.value).find(([, isBad]) => isBad)?.[0]
  if (firstInvalid) {
    document.getElementById(`promotion-${firstInvalid}`)?.focus()
    return
  }
  saving.value = true
  try {
    const body: PromotionInput = {
      name: form.name.trim(),
      kind: form.kind,
      code: isCode.value ? form.code.trim().toUpperCase() : null,
      discount_type: form.discount_type,
      value: form.value as number,
      all_products: form.all_products,
      products: form.all_products ? [] : form.products,
      starts_at: fromLocalInput(form.starts_at),
      ends_at: fromLocalInput(form.ends_at),
      max_uses: form.max_uses === '' ? null : form.max_uses,
      max_uses_per_user: !isCode.value || form.max_uses_per_user === '' ? null : form.max_uses_per_user,
      active: form.active,
      notes: form.notes,
    }
    const saved = props.promotion
      ? await $fetch<Promotion>(`/api/admin/promotions/${props.promotion.id}`, { method: 'PATCH', body })
      : await $fetch<Promotion>('/api/admin/promotions', { method: 'POST', body })
    submitted.value = false
    emit('saved', saved)
  }
  catch (e) {
    errors.value = cmsErrors(e)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="admin-panel" novalidate @submit.prevent="save">
    <div v-if="errors?.general" class="notice notice-error" role="alert">{{ errors.general }}</div>

    <fieldset class="field kinds" :disabled="editing">
      <legend>Tipo</legend>
      <label v-for="(kind, value) in PROMOTION_KIND" :key="value" class="kind" :class="{ chosen: form.kind === value }">
        <input v-model="form.kind" type="radio" name="promotion-kind" :value="value">
        <span>
          <strong>{{ kind.label }}</strong>
          <span class="muted small">{{ kind.hint }}</span>
        </span>
      </label>
      <p v-if="editing" class="field-hint">El tipo no se cambia una vez creada.</p>
    </fieldset>

    <div class="field-row">
      <div class="field">
        <label for="promotion-name">Nombre</label>
        <input id="promotion-name" v-model="form.name" type="text" maxlength="120"
               :placeholder="isCode ? 'Buen Fin 2026' : 'Lanzamiento'" :aria-invalid="bad('name')" required>
        <p v-if="fieldError('name')" class="field-hint error">{{ fieldError('name') }}</p>
        <p v-else class="field-hint">{{ isCode ? 'Para identificarlo en los reportes.' : 'Se muestra en el curso, p. ej. «Lanzamiento».' }}</p>
      </div>
      <div v-if="isCode" class="field">
        <label for="promotion-code">Código</label>
        <input id="promotion-code" v-model="form.code" type="text" maxlength="32" placeholder="BUENFIN26"
               autocapitalize="characters" spellcheck="false" class="mono" :aria-invalid="bad('code')" required>
        <p v-if="fieldError('code')" class="field-hint error">{{ fieldError('code') }}</p>
        <p v-else class="field-hint">3 a 32 letras sin acentos, números, guion o guion bajo.</p>
      </div>
    </div>

    <div class="field-row">
      <div class="field">
        <label for="promotion-discount_type">Descuento</label>
        <select id="promotion-discount_type" v-model="form.discount_type" :disabled="used">
          <option value="percent">Porcentaje</option>
          <option value="amount">Monto fijo (MXN)</option>
        </select>
      </div>
      <div class="field">
        <label for="promotion-value">{{ form.discount_type === 'percent' ? 'Porcentaje' : 'Pesos' }}</label>
        <input id="promotion-value" v-model.number="form.value" type="number" min="0.01" step="0.01"
               :max="form.discount_type === 'percent' ? maxPercent : undefined" inputmode="decimal"
               :disabled="used" :aria-invalid="bad('value')" required>
        <p v-if="fieldError('value')" class="field-hint error">{{ fieldError('value') }}</p>
        <p v-else class="field-hint">{{ valueHint }}</p>
      </div>
    </div>
    <p v-if="used" class="field-hint">Ya se usó: el descuento no se puede cambiar. Desactívala y crea otra.</p>
    <p class="field-hint">
      El precio nunca baja de $10 (el mínimo que cobra Stripe), salvo un código que deje el curso gratis.
      Los descuentos no se suman: si hay una oferta y un código, se aplica el que deje el precio más bajo.
    </p>

    <fieldset class="field courses" :aria-invalid="bad('products')">
      <legend>Cursos</legend>
      <label class="check all">
        <input v-model="form.all_products" type="checkbox">
        <span>Todos los cursos (también los que se pongan a la venta después)</span>
      </label>
      <template v-if="!form.all_products">
        <p v-if="productsError" class="field-hint error">No pudimos cargar los cursos. Recarga la página.</p>
        <ul v-else class="course-list">
          <li v-for="(product, i) in choices" :key="product.id">
            <label class="check">
              <input :id="i === 0 ? 'promotion-products' : undefined" v-model="form.products" type="checkbox" :value="product.id">
              <span>
                {{ product.title }}
                <span class="muted small">
                  {{ product.price ? money(product.price) : 'Sin precio' }} · {{ PRODUCT_STATUS[product.status].label }}
                </span>
              </span>
            </label>
          </li>
        </ul>
      </template>
      <p v-if="fieldError('products')" class="field-hint error">{{ fieldError('products') }}</p>
      <p v-else-if="submitted && invalid.products" class="field-hint error">Elige al menos un curso.</p>
    </fieldset>

    <div class="field-row">
      <div class="field">
        <label for="promotion-starts_at">Empieza</label>
        <input id="promotion-starts_at" v-model="form.starts_at" type="datetime-local">
        <p class="field-hint">Vacío: desde que la guardes.</p>
      </div>
      <div class="field">
        <label for="promotion-ends_at">Termina</label>
        <input id="promotion-ends_at" v-model="form.ends_at" type="datetime-local" :aria-invalid="bad('ends_at')">
        <p v-if="fieldError('ends_at')" class="field-hint error">{{ fieldError('ends_at') }}</p>
        <p v-else-if="submitted && invalid.ends_at" class="field-hint error">Termina antes de empezar.</p>
        <p v-else class="field-hint">Vacío: sin fecha de fin.</p>
      </div>
    </div>

    <div class="field-row">
      <div class="field">
        <label for="promotion-max_uses">Usos en total</label>
        <input id="promotion-max_uses" v-model.number="form.max_uses" type="number" min="1" step="1" inputmode="numeric"
               placeholder="Sin límite" :aria-invalid="bad('max_uses')">
        <p v-if="fieldError('max_uses')" class="field-hint error">{{ fieldError('max_uses') }}</p>
        <p v-else class="field-hint">P. ej. «los primeros 50». Una compra reembolsada sigue contando.</p>
      </div>
      <div v-if="isCode" class="field">
        <label for="promotion-max_uses_per_user">Usos por persona</label>
        <input id="promotion-max_uses_per_user" v-model.number="form.max_uses_per_user" type="number" min="1" step="1"
               inputmode="numeric" placeholder="Sin límite" :aria-invalid="bad('max_uses_per_user')">
        <p v-if="fieldError('max_uses_per_user')" class="field-hint error">{{ fieldError('max_uses_per_user') }}</p>
        <p v-else class="field-hint">En cuántos cursos puede usarlo cada persona.</p>
      </div>
    </div>

    <div class="field">
      <label class="check">
        <input v-model="form.active" type="checkbox">
        <span>Activa</span>
      </label>
      <p class="field-hint">Desactivarla la detiene de inmediato; quien ya compró conserva su precio.</p>
    </div>

    <div class="field">
      <label for="promotion-notes">Notas</label>
      <textarea id="promotion-notes" v-model="form.notes" rows="3" placeholder="Campaña, dónde se publicó el código…" />
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear promoción' }}
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.kinds,
.courses {
  margin: 0 0 20px;
  padding: 0;
  border: 0;
  min-width: 0;
}

.kinds legend,
.courses legend {
  margin-bottom: 6px;
  font-size: 0.92rem;
  font-weight: 600;
}

.kinds {
  display: grid;
  gap: 10px;
}

@media (min-width: 640px) {
  .kinds {
    grid-template-columns: 1fr 1fr;
  }

  .kinds legend,
  .kinds .field-hint {
    grid-column: 1 / -1;
  }
}

.kind {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  cursor: pointer;
}

.kind.chosen {
  border-color: var(--ui-primary);
  background: var(--ui-color-primary-50);
}

.kinds:disabled .kind {
  cursor: default;
}

.kind input,
.check input {
  width: auto;
  margin-top: 3px;
  accent-color: var(--ui-primary);
}

.courses {
  margin-top: 20px;
}

.course-list {
  display: grid;
  gap: 2px;
  max-height: 260px;
  margin: 8px 0 0;
  padding: 6px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
}

.courses[aria-invalid='true'] .course-list {
  border-color: var(--ui-color-error-500);
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 8px;
  border-radius: var(--brand-radius-sm);
  font-weight: 500;
  cursor: pointer;
}

.check.all {
  padding-left: 0;
}

.course-list .check:hover {
  background: var(--ui-bg-muted);
}

.small {
  display: block;
  font-size: 0.8rem;
  font-weight: 400;
}

.mono {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-hint.error {
  color: var(--ui-color-error-600);
}

.field-row + .field-hint,
.field-hint + .field-hint {
  margin-top: 0;
}
</style>
