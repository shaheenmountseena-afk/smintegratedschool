import Image from 'next/image'

// TODO: replace dummy photos with real campus photography
export function PhotoStrip({ photos }: { photos: { src: string; alt: string }[] }) {
  return (
    <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
      {photos.map((p, i) => (
        <li
          key={p.src + i}
          className={`relative overflow-hidden rounded-2xl bg-muted ${i === 0 ? 'col-span-2 aspect-[16/9] md:col-span-1 md:aspect-[4/3]' : 'aspect-[4/3]'}`}
        >
          <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
        </li>
      ))}
    </ul>
  )
}
