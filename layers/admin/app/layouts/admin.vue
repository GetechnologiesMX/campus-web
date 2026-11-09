<script setup lang="ts">
const me = useCmsMe()
const user = useEdxUser()
const config = useRuntimeConfig()
const route = useRoute()
const requestUrl = useRequestURL()
const logoutUrl = computed(() => user.value && `${user.value.header_urls.logout}?redirect_url=${encodeURIComponent(requestUrl.origin + '/')}`)

// Admin menu, like compliance-v2's (src/app/menu-admin): a side menu that the
// toolbar button opens and closes. Below `lg` USidebar shows it as a slideover.
const items = [
  { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: '/admin', exact: true },
  { label: 'Cursos', icon: 'i-lucide-book-open', to: '/admin/cursos' },
  { label: 'Ventas', icon: 'i-lucide-receipt-text', to: '/admin/ventas' },
]
const isActive = (item: { to: string, exact?: boolean }) =>
  item.exact ? route.path === item.to : route.path.startsWith(item.to)

const open = ref(true)

// On mobile the menu is a slideover: close it after choosing a page. On
// desktop `open` collapses the sidebar, so it is left alone there. 64rem is
// USidebar's `lg` breakpoint. Route changes only happen in the browser.
watch(() => route.fullPath, () => {
  if (!window.matchMedia('(min-width: 64rem)').matches) open.value = false
})

const initials = computed(() => (me.value?.username ?? '').slice(0, 2).toUpperCase())
</script>

<template>
  <div class="admin-shell">
    <USidebar
      v-model:open="open"
      collapsible="offcanvas"
      :ui="{
        root: '[--sidebar-width:250px]',
        container: 'border-(--header-border)',
        inner: 'divide-y-0 bg-(--header-bg)',
        header: 'min-h-0 px-[18px] pt-5 pb-2',
        body: 'gap-0 px-[18px] py-0',
        footer: 'flex-col items-stretch gap-0 px-[18px] pt-2 pb-5',
      }"
    >
      <template #header="{ close }">
        <NuxtLink to="/admin" class="brand">
          <img src="/logo.svg" alt="Campus" class="brand-logo">
          <span class="brand-tag">Administración</span>
        </NuxtLink>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          aria-label="Cerrar menú"
          class="ms-auto lg:hidden"
          @click="close"
        />
      </template>

      <nav aria-label="Administración">
        <ul class="menu">
          <li v-for="item in items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="item"
              :class="{ active: isActive(item) }"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              <UIcon :name="item.icon" class="item-icon" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <template #footer>
        <p class="menu-section">Accesos</p>
        <ul class="menu">
          <li>
            <a :href="config.public.studioUrl" class="item" target="_blank" rel="noopener">
              <UIcon name="i-lucide-square-pen" class="item-icon" />
              <span>Studio</span>
            </a>
          </li>
          <li>
            <NuxtLink to="/" class="item">
              <UIcon name="i-lucide-globe" class="item-icon" />
              <span>Ver sitio</span>
            </NuxtLink>
          </li>
        </ul>
      </template>
    </USidebar>

    <div class="admin-main">
      <header class="toolbar">
        <UButton
          icon="i-lucide-panel-left"
          color="neutral"
          variant="ghost"
          :aria-label="open ? 'Ocultar menú' : 'Mostrar menú'"
          :aria-expanded="open"
          class="toolbar-toggle"
          @click="open = !open"
        />
        <div class="toolbar-actions">
          <span v-if="me" class="toolbar-user" :title="me.email">
            <span class="avatar" aria-hidden="true">{{ initials }}</span>
            <span class="text-toolbar">{{ me.username }}</span>
          </span>
          <a v-if="logoutUrl" :href="logoutUrl" class="toolbar-link">
            <UIcon name="i-lucide-log-out" class="toolbar-icon" />
            <span class="text-toolbar">Salir</span>
          </a>
        </div>
      </header>

      <main>
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Colors, sizes and spacing from compliance-v2 (src/app/menu-admin and
   tema-compliance.css). The color tokens live in app/assets/css/main.css. */
.admin-shell {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
}

.admin-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

main {
  flex: 1;
  padding-bottom: 56px;
}

/* Logo + name (.razon / .compliance in compliance). */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin-bottom: 12px;
  text-decoration: none;
}

.brand-logo {
  display: block;
  height: 28px;
}

.brand-tag {
  overflow: hidden;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--brand-text);
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Menu item (.item / .active). The inactive text is --color-text-navigation,
   as in the header: compliance's #8b909a reads at 3.2:1 on white. */
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 30px;
  border-radius: 8px; /* --menu-item-radius */
  font-size: 13px;
  font-weight: 700;
  line-height: 22px;
  color: var(--header-link);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}

.item:hover {
  color: var(--header-text);
  background: var(--header-hover);
}

.item.active {
  color: var(--header-text); /* --menu-item-active-text */
  background: var(--header-hover); /* --menu-item-active-bg */
}

.item:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.item-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

/* Section title (.cumplimiento). */
.menu-section {
  margin: 0 0 4px;
  padding: 0 30px;
  font-size: 13px;
  font-weight: 700;
  line-height: 22px;
  color: var(--ui-text-muted);
}

/* Top bar (.toolbar): --header-height 71px, white, bottom border. */
.toolbar {
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 71px;
  padding: 0 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.toolbar-user,
.toolbar-link {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-link {
  text-decoration: none;
}

.toolbar-link:hover .text-toolbar {
  text-decoration: underline;
}

.text-toolbar {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: var(--ui-text-highlighted); /* --header-text */
}

.toolbar-icon {
  width: 20px;
  height: 20px;
  color: var(--ui-text-highlighted);
}

/* Avatar with initials (.usersk). */
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ui-color-neutral-700); /* --header-avatar-bg */
  font-size: 10px;
  font-weight: 600;
  color: #fff; /* --header-avatar-text */
}

@media (max-width: 450px) {
  .toolbar-user .text-toolbar {
    display: none;
  }
}
</style>

<!-- Shared by every admin page. -->
<style>
.admin-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
}

.admin-header h1 {
  margin: 0 0 8px;
  font-size: clamp(2rem, 4.4vw, 2.8rem);
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.admin-header .lead {
  margin: 0;
  font-size: 1.05rem;
  max-width: 56ch;
}

.admin-panel {
  padding: 24px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
}

@media (min-width: 768px) {
  .admin-panel {
    padding: 32px;
  }
}

.admin-panel + .admin-panel {
  margin-top: 24px;
}

.admin-panel h2 {
  margin: 0 0 4px;
  font-size: 1.2rem;
}

.admin-panel > .panel-intro {
  margin: 0 0 24px;
  font-size: 0.95rem;
}

.field + .field,
.field-row + .field,
.field + .field-row,
.field-row + .field-row {
  margin-top: 20px;
}

.field-row {
  display: grid;
  gap: 20px;
}

@media (min-width: 640px) {
  .field-row {
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  }
}

.field label {
  font-size: 0.92rem;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
}

.field select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  font: inherit;
  background: var(--ui-bg);
}

.field textarea {
  resize: vertical;
}

.field [aria-invalid='true'] {
  border-color: var(--ui-color-error-500);
}

.input-prefix {
  position: relative;
}

.input-prefix > span {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ui-text-muted);
  pointer-events: none;
}

.input-prefix > input {
  padding-left: 30px;
  font-variant-numeric: tabular-nums;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
}

.btn[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-small {
  padding: 7px 14px;
  font-size: 0.88rem;
}

.btn-danger {
  background: var(--ui-bg);
  border-color: var(--ui-border);
  color: var(--ui-color-error-600);
}

.btn-danger:hover {
  border-color: var(--ui-color-error-600);
}

.link-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  cursor: pointer;
}

.link-button:hover {
  color: var(--ui-text-highlighted);
}

.link-button.danger:hover {
  color: var(--ui-color-error-600);
}

.badge-warning {
  background: var(--ui-color-warning-50);
  color: var(--ui-color-warning-800);
}

.badge-success {
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-800);
}

.badge-muted {
  background: var(--ui-border);
  color: var(--ui-text-muted);
}

.notice-error {
  background: var(--ui-color-error-50);
  color: var(--ui-color-error-800);
}

.notice .link-button {
  margin-left: 8px;
  color: inherit;
  text-decoration: underline;
}
</style>
