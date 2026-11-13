<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Nueva promoción · Administración', robots: 'noindex' })

const toast = useToast()

async function created(promotion: Promotion) {
  toast.add({ title: 'Promoción creada', color: 'success' })
  await navigateTo(`/admin/promociones/${promotion.id}`)
}
</script>

<template>
  <div class="section container narrow">
    <NuxtLink to="/admin/promociones" class="back-link rise">← Promociones</NuxtLink>
    <header class="admin-header rise" style="--i: 1">
      <div>
        <h1>Nueva promoción</h1>
        <p class="muted lead">
          Una oferta baja el precio para todos durante un tiempo (curso nuevo, temporada). Un código de descuento solo
          aplica a quien lo escribe al comprar; puedes limitar cuántas veces se usa.
        </p>
      </div>
    </header>
    <PromotionForm class="rise" style="--i: 2" @saved="created" @cancel="navigateTo('/admin/promociones')" />
  </div>
</template>

<style scoped>
.narrow {
  max-width: 820px;
}

.back-link {
  margin-bottom: 20px;
}
</style>
