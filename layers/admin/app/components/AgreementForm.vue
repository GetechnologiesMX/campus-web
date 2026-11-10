<script setup lang="ts">
/** Create or edit a company agreement (convenio). Emits the saved agreement. */
const props = defineProps<{ agreement?: Agreement | null }>()
const emit = defineEmits<{ saved: [agreement: Agreement], cancel: [] }>()

const editing = computed(() => !!props.agreement)

// Courses a code can enroll in: created in Open edX or on sale.
const { data: products, error: productsError } = useFetch<Product[]>('/api/admin/products', {
  key: 'admin-agreement-products', server: false, default: () => [],
})
const choices = computed(() => products.value.filter(p => p.course_key && (p.status === 'created' || p.status === 'on_sale')))

function initial() {
  const a = props.agreement
  return {
    company: a?.company ?? '',
    contact_email: a?.contact_email ?? '',
    products: [...(a?.products ?? [])],
    seats: a?.seats ?? (10 as number | ''),
    code_prefix: a?.code_prefix ?? '',
    expires_at: a?.expires_at ?? addDays(todayInMexico(), 365),
    active: a?.active ?? true,
    notes: a?.notes ?? '',
  }
}
const form = reactive(initial())
watch(() => props.agreement, () => Object.assign(form, initial()))

// The prefix follows the company name until it's edited (new agreements only).
const prefixEdited = ref(editing.value)
watch(() => form.company, (company) => {
  if (!prefixEdited.value) form.code_prefix = prefixFrom(company)
})

const invalid = computed(() => ({
  company: !form.company.trim(),
  contact_email: !/^\S+@\S+\.\S+$/.test(form.contact_email.trim()),
  products: !form.products.length,
  seats: typeof form.seats !== 'number' || form.seats < 1 || !Number.isInteger(form.seats),
  code_prefix: !CODE_PREFIX.test(form.code_prefix.trim().toUpperCase()),
  expires_at: !form.expires_at,
}))

const submitted = ref(false)
const saving = ref(false)
const errors = ref<CmsErrors>()
const fieldError = (name: string) => errors.value?.fields[name]
const bad = (name: keyof typeof invalid.value) => (submitted.value && invalid.value[name]) || !!fieldError(name)

async function save() {
  submitted.value = true
  errors.value = undefined
  const firstInvalid = Object.entries(invalid.value).find(([, isBad]) => isBad)?.[0]
  if (firstInvalid) {
    document.getElementById(`agreement-${firstInvalid}`)?.focus()
    return
  }
  saving.value = true
  try {
    const body: AgreementInput = {
      company: form.company.trim(),
      contact_email: form.contact_email.trim(),
      products: form.products,
      seats: form.seats as number,
      code_prefix: form.code_prefix.trim().toUpperCase(),
      expires_at: form.expires_at,
      active: form.active,
      notes: form.notes,
    }
    const saved = props.agreement
      ? await $fetch<Agreement>(`/api/admin/agreements/${props.agreement.id}`, { method: 'PATCH', body })
      : await $fetch<Agreement>('/api/admin/agreements', { method: 'POST', body })
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

    <div class="field-row">
      <div class="field">
        <label for="agreement-company">Empresa</label>
        <input id="agreement-company" v-model="form.company" type="text" maxlength="255" placeholder="ACME S.A. de C.V."
               :aria-invalid="bad('company')" required>
        <p v-if="fieldError('company')" class="field-hint error">{{ fieldError('company') }}</p>
      </div>
      <div class="field">
        <label for="agreement-contact_email">Correo de contacto</label>
        <input id="agreement-contact_email" v-model="form.contact_email" type="email" maxlength="254" placeholder="rh@empresa.com"
               autocapitalize="none" spellcheck="false" :aria-invalid="bad('contact_email')" required>
        <p v-if="fieldError('contact_email')" class="field-hint error">{{ fieldError('contact_email') }}</p>
      </div>
    </div>

    <fieldset class="field courses" :aria-invalid="bad('products')">
      <legend id="agreement-products-label">Cursos incluidos</legend>
      <p v-if="productsError" class="field-hint error">No pudimos cargar los cursos. Recarga la página.</p>
      <p v-else-if="!choices.length" class="field-hint">Todavía no hay cursos creados en Open edX.</p>
      <ul v-else class="course-list">
        <li v-for="(product, i) in choices" :key="product.id">
          <label class="check">
            <input :id="i === 0 ? 'agreement-products' : undefined" v-model="form.products" type="checkbox" :value="product.id">
            <span>
              {{ product.title }}
              <span class="muted small">{{ product.course_key }} · {{ PRODUCT_STATUS[product.status].label }}</span>
            </span>
          </label>
        </li>
      </ul>
      <p v-if="fieldError('products')" class="field-hint error">{{ fieldError('products') }}</p>
      <p v-else-if="submitted && invalid.products" class="field-hint error">Elige al menos un curso.</p>
      <p v-else class="field-hint">Puede incluir cursos que no están a la venta al público.</p>
    </fieldset>

    <div class="field-row">
      <div class="field">
        <label for="agreement-seats">Lugares comprados</label>
        <input id="agreement-seats" v-model.number="form.seats" type="number" min="1" step="1" inputmode="numeric"
               :aria-invalid="bad('seats')" required>
        <p v-if="fieldError('seats')" class="field-hint error">{{ fieldError('seats') }}</p>
        <p v-else class="field-hint">Un código por lugar. Los anulados sin usar no cuentan.</p>
      </div>
      <div class="field">
        <label for="agreement-code_prefix">Prefijo de los códigos</label>
        <input id="agreement-code_prefix" v-model="form.code_prefix" type="text" maxlength="6" placeholder="ACME"
               autocapitalize="characters" spellcheck="false" class="mono" :aria-invalid="bad('code_prefix')" required
               @input="prefixEdited = true">
        <p v-if="fieldError('code_prefix')" class="field-hint error">{{ fieldError('code_prefix') }}</p>
        <p v-else class="field-hint">
          2 a 6 caracteres, sin 0, 1, O, I ni L. Ej.: <code>{{ (form.code_prefix || 'ACME').toUpperCase() }}-7K3P-Q9XD</code>
        </p>
      </div>
      <div class="field">
        <label for="agreement-expires_at">Se puede canjear hasta</label>
        <input id="agreement-expires_at" v-model="form.expires_at" type="date" :aria-invalid="bad('expires_at')" required>
        <p v-if="fieldError('expires_at')" class="field-hint error">{{ fieldError('expires_at') }}</p>
        <p v-else class="field-hint">Incluye ese día.</p>
      </div>
    </div>

    <div class="field">
      <label class="check">
        <input v-model="form.active" type="checkbox">
        <span>Activo: los empleados pueden canjear sus códigos</span>
      </label>
      <p class="field-hint">{{ NO_REVOKE_NOTE }}</p>
    </div>

    <div class="field">
      <label for="agreement-notes">Notas</label>
      <textarea id="agreement-notes" v-model="form.notes" rows="3" placeholder="Factura, link de pago, condiciones…" />
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">
        {{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear convenio' }}
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.courses {
  margin: 20px 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.courses legend {
  margin-bottom: 6px;
  font-size: 0.92rem;
  font-weight: 600;
}

.course-list {
  display: grid;
  gap: 2px;
  max-height: 260px;
  margin: 0;
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

.course-list .check:hover {
  background: var(--ui-bg-muted);
}

.check input {
  width: auto;
  margin-top: 3px;
  accent-color: var(--ui-primary);
}

.small {
  display: block;
  font-size: 0.8rem;
  font-weight: 400;
  overflow-wrap: anywhere;
}

.mono {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-hint.error {
  color: var(--ui-color-error-600);
}

code {
  font-size: 0.85em;
}
</style>
