<script setup lang="ts">
import type {
  HeroStyle,
  PageLayoutPreset,
  PageSurface,
  TemplatePreviewStatItem,
  TemplatePreviewStyle,
  TemplatePreviewTimelineItem,
} from '@/types/template-editor'

defineProps<{
  previewLayout: PageLayoutPreset
  previewSurface: PageSurface
  previewHeroStyle: HeroStyle
  themeStyle: TemplatePreviewStyle
  surfaceLabel: string
  heroEyebrow: string
  coverReady: boolean
  templateName: string
  templateSceneCode: string
  layoutLabel: string
  heroLabel: string
  focusItems: readonly string[]
  showProfile: boolean
  profileTitle: string
  profileText: string
  showStats: boolean
  statItems: readonly TemplatePreviewStatItem[]
  showTimeline: boolean
  timelineItems: readonly TemplatePreviewTimelineItem[]
  showContactCta: boolean
  primaryActionLabel: string
  secondaryActionVisible: boolean
  secondaryActionLabel: string
}>()
</script>

<template>
  <aside class="template-editor-preview">
    <div class="template-editor-preview__head">
      <div>
        <p>MINI PROGRAM VIEW / 小程序页面预览</p>
        <strong>配置结果实时预览</strong>
      </div>
      <span>预览只承接模板结构、主题和 CTA，并按当前配置展示页面效果。</span>
    </div>

    <div
      class="mini-program-preview"
      :data-layout="previewLayout"
      :data-surface="previewSurface"
      :data-hero="previewHeroStyle"
      :style="themeStyle"
    >
      <div class="mini-program-preview__device">
        <div class="mini-program-preview__status">
          <span>9:41</span>
          <em>{{ surfaceLabel }}</em>
        </div>

        <div class="mini-program-preview__canvas">
          <section class="mini-program-preview__hero">
            <div v-if="heroEyebrow || coverReady" class="mini-program-preview__hero-top">
              <p v-if="heroEyebrow">{{ heroEyebrow }}</p>
              <span v-if="coverReady">COVER READY</span>
            </div>
            <strong v-if="templateName">{{ templateName }}</strong>
            <small>{{ templateSceneCode ? `${templateSceneCode} · ` : '' }}{{ layoutLabel }} · {{ heroLabel }}</small>
            <div v-if="focusItems.length" class="mini-program-preview__chips">
              <em v-for="item in focusItems" :key="item">{{ item }}</em>
            </div>
          </section>

          <section v-if="showProfile" class="mini-program-preview__section">
            <header>
              <span>PROFILE</span>
              <em>信息层</em>
            </header>
            <strong>{{ profileTitle }}</strong>
            <p>{{ profileText }}</p>
          </section>

          <section v-if="showStats" class="mini-program-preview__section mini-program-preview__section--stats">
            <article v-for="item in statItems" :key="item.label">
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
            </article>
          </section>

          <section v-if="showTimeline" class="mini-program-preview__section mini-program-preview__section--timeline">
            <header>
              <span>TIMELINE</span>
              <em>内容节奏</em>
            </header>
            <div class="mini-program-preview__timeline">
              <article v-for="item in timelineItems" :key="item.title">
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
              </article>
            </div>
          </section>

          <section v-if="showContactCta" class="mini-program-preview__actions">
            <button type="button" class="mini-program-preview__action mini-program-preview__action--primary">
              {{ primaryActionLabel }}
            </button>
            <button v-if="secondaryActionVisible" type="button" class="mini-program-preview__action mini-program-preview__action--secondary">
              {{ secondaryActionLabel }}
            </button>
          </section>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.template-editor-preview {
  position: sticky;
  top: 12px;
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(80, 63, 47, 0.08);
  border-radius: 26px;
  background:
    radial-gradient(circle at top left, rgba(214, 234, 217, 0.52), transparent 38%),
    linear-gradient(180deg, rgba(255, 252, 247, 0.94), rgba(244, 236, 224, 0.82));
}

.template-editor-preview__head {
  display: grid;
  gap: 8px;

  p {
    margin: 0 0 4px;
    color: rgba(47, 36, 27, 0.45);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.18em;
  }

  strong {
    font-size: 17px;
  }

  span {
    color: rgba(47, 36, 27, 0.52);
    font-size: 12px;
    line-height: 1.6;
  }
}

.mini-program-preview {
  display: grid;
  place-items: center;
  padding: 14px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--template-preview-accent) 44%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--template-preview-background) 92%, #ffffff), var(--template-preview-background));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

.mini-program-preview[data-surface='softlight'] {
  background:
    radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--template-preview-accent) 58%, transparent), transparent 34%),
    radial-gradient(circle at 85% 28%, rgba(255, 255, 255, 0.18), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--template-preview-background) 86%, #ffffff), var(--template-preview-background));
}

.mini-program-preview[data-surface='cinema'] {
  background:
    radial-gradient(circle at 50% 0, color-mix(in srgb, var(--template-preview-primary) 46%, transparent), transparent 38%),
    linear-gradient(180deg, color-mix(in srgb, var(--template-preview-background) 62%, #000000), #090807);
}

.mini-program-preview__device {
  width: min(100%, 316px);
  overflow: hidden;
  border: 8px solid rgba(14, 13, 12, 0.92);
  border-radius: 36px;
  background: color-mix(in srgb, var(--template-preview-background) 86%, #ffffff);
  color: var(--template-preview-text);
  box-shadow: 0 24px 54px rgba(21, 17, 13, 0.24);
}

.mini-program-preview__status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px 8px;
  color: color-mix(in srgb, var(--template-preview-text) 82%, #ffffff);
  font-size: 11px;
  font-weight: 800;

  em {
    font-size: 10px;
    font-style: normal;
    letter-spacing: 0.12em;
  }
}

.mini-program-preview__canvas {
  display: grid;
  gap: var(--template-preview-gap);
  min-height: 560px;
  padding: var(--template-preview-padding);
  background:
    linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.05)),
    color-mix(in srgb, var(--template-preview-background) 76%, #ffffff);
}

.mini-program-preview__hero,
.mini-program-preview__section,
.mini-program-preview__actions {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  background: color-mix(in srgb, var(--template-preview-background) 76%, #ffffff);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.mini-program-preview__hero {
  display: grid;
  align-content: end;
  gap: 10px;
  min-height: var(--template-preview-hero-min-height);
  padding: var(--template-preview-hero-padding);
  overflow: hidden;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--template-preview-primary) 48%, transparent), transparent 38%),
    linear-gradient(160deg, color-mix(in srgb, var(--template-preview-background) 78%, #ffffff), var(--template-preview-background));

  strong {
    color: var(--template-preview-hero-text);
    font-size: 25px;
    line-height: 1.12;
  }

  small {
    color: color-mix(in srgb, var(--template-preview-text) 70%, #ffffff);
    font-size: 12px;
  }
}

.mini-program-preview[data-hero='poster'] .mini-program-preview__hero {
  align-content: space-between;
  min-height: calc(var(--template-preview-hero-min-height) + 30px);
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.24)),
    radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--template-preview-accent) 58%, transparent), transparent 42%),
    var(--template-preview-background);
}

.mini-program-preview[data-hero='profile'] .mini-program-preview__hero {
  align-content: center;
  border-radius: 28px;

  strong {
    font-size: 22px;
  }
}

.mini-program-preview[data-layout='casting'] .mini-program-preview__hero {
  min-height: 132px;
}

.mini-program-preview[data-layout='portfolio'] .mini-program-preview__hero {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--template-preview-primary) 34%, transparent), transparent),
    linear-gradient(180deg, color-mix(in srgb, var(--template-preview-background) 82%, #ffffff), var(--template-preview-background));
}

.mini-program-preview__hero-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;

  p {
    margin: 0;
    color: color-mix(in srgb, var(--template-preview-accent) 74%, #ffffff);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  span {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: var(--template-preview-hero-text);
    font-size: 9px;
    font-weight: 800;
  }
}

.mini-program-preview__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;

  em {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 0 9px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--template-preview-primary) 24%, #ffffff);
    color: var(--template-preview-hero-text);
    font-size: 10px;
    font-style: normal;
    font-weight: 800;
  }
}

.mini-program-preview__section {
  display: grid;
  gap: 8px;
  padding: 13px;

  header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: color-mix(in srgb, var(--template-preview-text) 58%, #ffffff);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  header em {
    font-style: normal;
    letter-spacing: 0;
  }

  > strong {
    color: var(--template-preview-hero-text);
    font-size: 15px;
  }

  p {
    margin: 0;
    color: color-mix(in srgb, var(--template-preview-text) 72%, #ffffff);
    font-size: 12px;
    line-height: 1.55;
  }
}

.mini-program-preview__section--stats {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  article {
    display: grid;
    gap: 2px;
    padding: 9px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.08);
  }

  strong {
    color: var(--template-preview-hero-text);
    font-size: 17px;
  }

  span {
    color: color-mix(in srgb, var(--template-preview-text) 66%, #ffffff);
    font-size: 10px;
  }
}

.mini-program-preview__timeline {
  display: grid;
  gap: 8px;

  article {
    display: grid;
    gap: 3px;
    padding-left: 12px;
    border-left: 2px solid color-mix(in srgb, var(--template-preview-accent) 62%, transparent);
  }

  strong {
    color: var(--template-preview-hero-text);
    font-size: 12px;
  }

  span {
    color: color-mix(in srgb, var(--template-preview-text) 68%, #ffffff);
    font-size: 11px;
    line-height: 1.45;
  }
}

.mini-program-preview__actions {
  display: grid;
  gap: 8px;
  padding: 10px;
  background: color-mix(in srgb, var(--template-preview-background) 72%, #ffffff);
}

.mini-program-preview__action {
  min-height: 38px;
  border: 0;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.mini-program-preview__action--primary {
  background: var(--template-preview-primary);
  color: var(--template-preview-hero-text);
}

.mini-program-preview__action--secondary {
  border: 1px solid color-mix(in srgb, var(--template-preview-accent) 42%, transparent);
  background: transparent;
  color: var(--template-preview-text);
}

@media (max-width: 1400px) {
  .template-editor-preview {
    position: static;
  }
}

@media (max-width: 720px) {
  .mini-program-preview__section--stats {
    grid-template-columns: 1fr;
  }
}
</style>
