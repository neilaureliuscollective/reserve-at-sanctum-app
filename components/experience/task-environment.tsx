import Image from 'next/image';
export function TaskEnvironment({world}:{world:'chair'|'mirror'}) {
  return <div className={`task-environment task-environment--${world}`} aria-hidden="true"><Image src={world === 'chair' ? '/images/katie/private-chair.webp' : '/images/neil/mirror-desk.webp'} alt="" fill sizes="(max-width: 760px) 100vw, 45vw" /><span>CONCEPT ENVIRONMENT</span></div>;
}
