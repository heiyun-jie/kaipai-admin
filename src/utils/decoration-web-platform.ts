// Native interactions have Web equivalents; editor capture prevents them while editing.
const open = (url: string) => { if (/^https:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer') }
export const webPlatform = {
  previewImage({ current }: { urls: string[]; current: string }) { open(current) },
  navigateTo({ url }: { url: string }) { const video = new URLSearchParams(url.split('?')[1]).get('url'); if (video) open(video) },
  showToast({ title }: { title: string; icon?: string }) { console.info(title) },
  makePhoneCall({ phoneNumber, fail }: { phoneNumber: string; fail?: () => void }) {
    const number = phoneNumber.replace(/[\s-]/g, '')
    if (!/^\+?[0-9]{3,20}$/.test(number)) { fail?.(); return }
    window.location.assign(`tel:${number}`)
  },
}
