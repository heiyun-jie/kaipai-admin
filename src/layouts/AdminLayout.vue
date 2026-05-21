<template>
  <div class="admin-layout">
    <AdminSidebar />
    <div class="admin-layout__main">
      <AdminTopbar />
      <main class="admin-layout__content">
        <div class="admin-layout__content-shell">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AdminTopbar from '@/components/layout/AdminTopbar.vue'
</script>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(34, 31, 28, 0.06), transparent 26%),
    radial-gradient(circle at bottom right, rgba(153, 120, 74, 0.08), transparent 24%),
    linear-gradient(180deg, #f3efe8 0%, #f6f2eb 100%);
}

.admin-layout__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 16px 0;
}

.admin-layout__content {
  flex: 1;
  padding: 0 0 0 16px;
}

.admin-layout__content-shell {
  min-height: 100%;
  padding: 18px 20px 24px;
  border: 1px solid rgba(34, 31, 28, 0.08);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.94), rgba(247, 241, 233, 0.9)),
    rgba(255, 251, 246, 0.92);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 12px 28px rgba(63, 42, 20, 0.07);
}

@media (max-width: 760px) {
  .admin-layout {
    flex-direction: column;
  }

  .admin-layout__main {
    padding: 0 10px 10px;
  }

  .admin-layout__content {
    padding: 0;
  }

  .admin-layout__content-shell {
    padding: 16px 14px 20px;
    border-radius: 22px;
  }
}
</style>
