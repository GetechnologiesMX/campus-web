<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Nuevo convenio · Administración', robots: 'noindex' })

const toast = useToast()

async function created(agreement: Agreement) {
  toast.add({ title: 'Convenio creado', description: 'Ahora genera sus códigos.', color: 'success' })
  await navigateTo(`/admin/convenios/${agreement.id}`)
}
</script>

<template>
  <div class="section container narrow">
    <NuxtLink to="/admin/convenios" class="back-link rise">← Convenios</NuxtLink>
    <header class="admin-header rise" style="--i: 1">
      <div>
        <h1>Nuevo convenio</h1>
        <p class="muted lead">
          La empresa paga por fuera (factura o link de pago). Aquí registras cuántos lugares compró y para qué cursos;
          después generas un código por lugar para que sus empleados entren sin pagar.
        </p>
      </div>
    </header>
    <AgreementForm class="rise" style="--i: 2" @saved="created" @cancel="navigateTo('/admin/convenios')" />
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
