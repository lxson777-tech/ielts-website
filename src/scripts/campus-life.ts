/** Ambient student movement stays behind the independently scroll-driven gates. */
export function mountCampusLife(stage: HTMLElement) {
  const video=stage.querySelector<HTMLVideoElement>('[data-campus-life]');
  if(!video)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false,failed=false;
  function sync(){
    if(!visible || document.hidden || reduce.matches || failed){video!.pause();return;}
    if(!video!.src)video!.src=video!.dataset.src!;
    // Keep the campus still image visible if the browser blocks autoplay.
    void video!.play().catch(()=>{video!.style.opacity='0';});
  }
  video.addEventListener('playing',()=>{video.style.opacity='1';});
  video.addEventListener('error',()=>{failed=true;video.style.opacity='0';});
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(stage);
  document.addEventListener('visibilitychange',sync);
  reduce.addEventListener('change',()=>{
    if(reduce.matches)video.style.opacity='0';
    sync();
  });
}
