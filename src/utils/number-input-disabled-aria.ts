import { nextTick, type ObjectDirective } from 'vue'

export function syncNumberInputDisabledAria(form: HTMLElement): void {
  // ElementPlus 2.13.x sets this only at mount; initial async loading can
  // otherwise leave an enabled numeric input announced as disabled forever.
  for (const input of form.querySelectorAll<HTMLInputElement>('input[role="spinbutton"]')) {
    input.setAttribute('aria-disabled', String(input.disabled))
  }
}

function afterUpdate(form: HTMLElement) {
  void nextTick(() => syncNumberInputDisabledAria(form))
}

export const vNumberInputDisabledAria: ObjectDirective<HTMLElement, boolean> = {
  mounted: afterUpdate,
  updated: afterUpdate,
}
