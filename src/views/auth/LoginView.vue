<template>
  <div class="login-view">
    <section class="login-hero">
      <div class="login-hero__brand">
        <span class="login-hero__brand-mark">{{ ADMIN_BRAND.adminMark }}</span>
        <div class="login-hero__brand-copy">
          <strong>{{ ADMIN_BRAND.platformName }}</strong>
          <p>ADMIN CONSOLE</p>
        </div>
      </div>

      <div class="login-hero__content">
        <p class="login-hero__tagline">— 一张卡片，一次邂逅 —</p>
        <h1>
          让每一位
          <br />
          创作者的分享
          <br />
          都值得被看见
        </h1>
        <p class="login-hero__description">
          后台管理平台提供完整的用户、内容、数据与运营工具链。
        </p>
      </div>

      <div class="login-hero__stats">
        <article v-for="item in stats" :key="item.label" class="login-hero__stat">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </article>
      </div>

      <footer class="login-hero__footer">
        <span>© 2026 kplyyk.com · ALL RIGHTS RESERVED</span>
        <span>V 2.4.1</span>
      </footer>
    </section>

    <section class="login-panel">
      <div class="login-panel__secure">
        <i />
        <span>SECURE · SSL</span>
      </div>

      <div class="login-panel__body">
        <header class="login-panel__header">
          <p>WELCOME BACK · 欢迎回来</p>
          <h1>登录到管理后台</h1>
          <span>请使用后台账号和密码登录</span>
        </header>

        <el-form :model="form" label-position="top" class="login-panel__form" @submit.prevent="submit">
          <el-form-item label="后台账号">
            <el-input v-model="form.account" placeholder="请输入后台账号" size="large">
              <template #prefix>
                <span class="login-panel__input-icon">◌</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" show-password placeholder="输入密码" size="large">
              <template #prefix>
                <span class="login-panel__input-icon">◎</span>
              </template>
            </el-input>
          </el-form-item>

          <el-button type="primary" size="large" class="login-panel__submit" :loading="loading" @click="submit">
            登 录
            <span class="login-panel__submit-arrow">›</span>
          </el-button>
        </el-form>

        <footer class="login-panel__links">
          <span>服务条款</span>
          <i>·</i>
          <span>隐私协议</span>
          <i>·</i>
          <span>帮助中心</span>
        </footer>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { ADMIN_BRAND } from '@/constants/brand'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const loading = ref(false)

const form = reactive({
  account: '',
  password: '',
})

const stats = [
  { value: '482', label: '位创作者' },
  { value: '24,318', label: '位用户' },
  { value: '128K+', label: '次分享' },
]

async function submit() {
  if (!form.account || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }

  loading.value = true
  try {
    await authStore.login(form.account, form.password)
    router.replace(String(route.query.redirect || permissionStore.landingPath || '/403'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-view {
  display: grid;
  grid-template-columns: 0.45fr 0.55fr;
  min-height: 100vh;
  background: #f6f2eb;
}

.login-hero {
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 40px;
  padding: 34px 42px 28px;
  color: #f5efe6;
  background:
    linear-gradient(180deg, rgba(18, 17, 15, 0.78), rgba(26, 23, 20, 0.9)),
    repeating-linear-gradient(145deg, rgba(255, 255, 255, 0.035) 0 2px, transparent 2px 12px),
    #1c1917;
}

.login-hero__brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login-hero__brand-mark {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(180deg, #c9a571, #ac8858);
  color: #171411;
  font-size: 28px;
  font-family: 'STSong', 'SimSun', serif;
}

.login-hero__brand-copy {
  display: grid;
  gap: 4px;

  strong {
    font-size: 24px;
    font-weight: 500;
    letter-spacing: 0.28em;
  }

  p {
    margin: 0;
    color: rgba(245, 239, 230, 0.68);
    font-size: 12px;
    letter-spacing: 0.34em;
  }
}

.login-hero__content {
  align-self: center;
  max-width: 540px;
}

.login-hero__tagline {
  margin: 0 0 30px;
  color: rgba(245, 239, 230, 0.42);
  font-size: 18px;
  letter-spacing: 0.18em;
}

.login-hero__content h1 {
  margin: 0;
  font-size: clamp(56px, 5vw, 76px);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.login-hero__description {
  max-width: 510px;
  margin: 38px 0 0;
  color: rgba(245, 239, 230, 0.7);
  font-size: 18px;
  line-height: 1.9;
}

.login-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  padding-top: 34px;
  border-top: 1px solid rgba(245, 239, 230, 0.12);
}

.login-hero__stat {
  display: grid;
  gap: 10px;

  strong {
    color: #d7b17b;
    font-size: 32px;
    font-weight: 500;
  }

  span {
    color: rgba(245, 239, 230, 0.45);
    font-size: 14px;
  }
}

.login-hero__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: rgba(245, 239, 230, 0.34);
  font-size: 12px;
  letter-spacing: 0.18em;
}

.login-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 18px 22px;
  background:
    linear-gradient(180deg, rgba(249, 246, 239, 0.98), rgba(245, 241, 233, 0.94)),
    #f6f2eb;
}

.login-panel__secure {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: rgba(47, 36, 27, 0.56);
  font-size: 13px;
  letter-spacing: 0.32em;

  i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #72a486;
    box-shadow: 0 0 0 4px rgba(114, 164, 134, 0.12);
  }
}

.login-panel__body {
  align-self: center;
  width: min(540px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 28px;
}

.login-panel__header {
  display: grid;
  gap: 14px;

  p {
    margin: 0;
    color: #a78659;
    font-size: 14px;
    letter-spacing: 0.34em;
  }

  h1 {
    margin: 0;
    color: #1d1a17;
    font-size: clamp(42px, 4vw, 58px);
    font-weight: 500;
    line-height: 1.14;
  }

  span {
    color: rgba(47, 36, 27, 0.72);
    font-size: 18px;
    line-height: 1.8;
  }
}

.login-panel__form {
  display: grid;
  gap: 6px;
}

.login-panel__form :deep(.el-form-item__label) {
  color: rgba(47, 36, 27, 0.58);
  font-size: 15px;
  letter-spacing: 0.18em;
}

.login-panel__form :deep(.el-input__wrapper) {
  min-height: 58px;
  border-radius: 18px;
  border-color: rgba(29, 26, 23, 0.1);
  background: rgba(255, 255, 255, 0.82);
}

.login-panel__input-icon {
  color: rgba(47, 36, 27, 0.48);
  font-size: 18px;
}

.login-panel__submit {
  width: 100%;
  min-height: 62px;
  margin-top: 8px;
  border-radius: 18px;
  background: #1d1a17;
  border-color: #1d1a17;
  font-size: 28px;
  letter-spacing: 0.24em;
}

.login-panel__submit :deep(span) {
  display: inline-flex;
  align-items: center;
  gap: 18px;
}

.login-panel__submit-arrow {
  font-size: 30px;
  transform: translateY(-1px);
}

.login-panel__links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding-top: 6px;
  border-top: 1px solid rgba(29, 26, 23, 0.1);
  color: rgba(47, 36, 27, 0.48);
  font-size: 15px;
}

@media (max-width: 1280px) {
  .login-view {
    grid-template-columns: 1fr;
  }

  .login-hero,
  .login-panel {
    padding-left: 28px;
    padding-right: 28px;
  }

  .login-hero {
    min-height: 46vh;
  }

  .login-hero__content h1 {
    font-size: clamp(42px, 6vw, 60px);
  }
}

@media (max-width: 760px) {
  .login-hero,
  .login-panel {
    padding-left: 18px;
    padding-right: 18px;
  }

  .login-hero__stats {
    grid-template-columns: 1fr;
  }

  .login-hero__content h1,
  .login-panel__header h1 {
    font-size: 40px;
  }

  .login-panel__submit {
    font-size: 22px;
  }
}
</style>
