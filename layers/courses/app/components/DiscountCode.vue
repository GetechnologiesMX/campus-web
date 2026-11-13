<script setup lang="ts">
/**
 * "¿Tienes un código de descuento?": checks a promotion code with the CMS and
 * hands the resulting price to the page (v-model), which shows it and passes
 * the code to /comprar. Opens by itself with ?codigo= in the URL (a shared
 * link, or /comprar sending the buyer back because the code didn't work).
 */
const props = defineProps<{ courseId: string }>()
const quote = defineModel<PriceQuote | null>({ default: null })

const route = useRoute()
const open = ref(false)
const code = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)

async function apply() {
  error.value = ''
  notice.value = ''
  if (!code.value.trim()) {
    error.value = 'Escribe tu código.'
    return
  }
  busy.value = true
  try {
    const result = await $fetch<PriceQuote>(`/api/courses/${encodeURIComponent(props.courseId)}/quote`, {
      method: 'POST',
      body: { code: code.value },
    })
    if (result.code_ignored) {
      notice.value = 'Tu código es válido, pero la oferta actual ya te da un mejor precio.'
      quote.value = null
    }
    else {
      quote.value = result
    }
  }
  catch (err) {
    const data = (err as { data?: { detail?: string } }).data
    error.value = data?.detail ?? 'No pudimos revisar el código. Intenta de nuevo en un momento.'
    quote.value = null
  }
  finally {
    busy.value = false
  }
}

function remove() {
  quote.value = null
  code.value = ''
  notice.value = ''
}

onMounted(() => {
  const fromUrl = route.query.codigo
  if (typeof fromUrl !== 'string' || !fromUrl.trim()) return
  open.value = true
  code.value = fromUrl.slice(0, 64)
  apply()
})
</script>

<template>
  <div class="discount">
    <p v-if="quote" class="applied" role="status">
      <span>
        Código <strong>{{ quote.code }}</strong> aplicado:
        {{ quote.free ? 'curso gratis' : `−${formatPrice(Number(quote.discount), 'mxn')}` }}
      </span>
      <button type="button" class="link-button" @click="remove">Quitar</button>
    </p>
    <button v-else-if="!open" type="button" class="discount-toggle" @click="open = true">
      ¿Tienes un código de descuento?
    </button>
    <form v-else class="discount-form" @submit.prevent="apply">
      <label :for="`discount-${courseId}`">Código de descuento</label>
      <div class="discount-row">
        <input
          :id="`discount-${courseId}`"
          v-model="code"
          type="text"
          placeholder="BUENFIN"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          maxlength="64"
          :disabled="busy"
          :aria-invalid="!!error"
          :aria-describedby="error ? `discount-error-${courseId}` : undefined"
        >
        <button type="submit" class="btn btn-secondary" :disabled="busy">{{ busy ? 'Revisando…' : 'Aplicar' }}</button>
      </div>
      <p v-if="error" :id="`discount-error-${courseId}`" class="discount-error" role="alert">{{ error }}</p>
      <p v-else-if="notice" class="discount-hint" role="status">{{ notice }}</p>
    </form>
  </div>
</template>

<style scoped>
.discount {
  margin-top: 16px;
}

.discount-toggle {
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

.discount-toggle:hover {
  text-decoration: underline;
}

.discount-form label {
  font-size: 0.9rem;
}

.discount-row {
  display: flex;
  gap: 8px;
}

.discount-row input {
  min-width: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.discount-row .btn {
  flex-shrink: 0;
  padding-left: 16px;
  padding-right: 16px;
}

.applied {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--brand-radius-sm);
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-800);
  font-size: 0.9rem;
}

.link-button {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.discount-error,
.discount-hint {
  margin: 8px 0 0;
  font-size: 0.85rem;
}

.discount-error {
  color: var(--ui-color-error-700);
}

.discount-hint {
  color: var(--ui-text-muted);
}
</style>
