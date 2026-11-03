/** Measure actual DOM geometry, not text-length estimates or preset arithmetic. */
export function hasDecorationPromotionHeightOverflow(canvas: HTMLElement | null): boolean {
  if (!canvas) return false
  return Array.from(canvas.querySelectorAll<HTMLElement>('.actor-card-decoration__promotion-pill')).some(pill => {
    if (!pill.textContent?.trim()) return false
    const module = pill.closest<HTMLElement>('[data-module]')
    if (!module || module.clientHeight <= 0 || pill.clientHeight <= 0) return false
    // Natural layout pixels catch inner clipping and a pill that cannot fit at any position.
    if (pill.scrollHeight > pill.clientHeight + 1 || Math.max(pill.offsetHeight || pill.clientHeight, pill.scrollHeight) > module.clientHeight + 1) return true
    // A short pill can still be clipped after marginTop / alignment moves it beyond the rectangle.
    // Both rects share the preview transform. Convert the one-layout-pixel tolerance and module
    // inner border edge to that same scale rather than comparing transformed and layout pixels.
    const moduleRect = module.getBoundingClientRect(), pillRect = pill.getBoundingClientRect()
    const scaleY = moduleRect.height / (module.offsetHeight || module.clientHeight)
    if (!Number.isFinite(scaleY) || scaleY <= 0) return false
    const top = moduleRect.top + module.clientTop * scaleY
    const bottom = top + module.clientHeight * scaleY
    return pillRect.top < top - scaleY || pillRect.bottom > bottom + scaleY
  })
}
