import HeroHeader from './components/HeroHeader.jsx'

export default function App() {
  return (
    <>
      <HeroHeader />

      {/* Sección destino del botón "Ver Proyectos" */}
      <section
        id="proyectos"
        className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-24"
      >
        <h2 className="text-4xl font-bold md:text-5xl">Proyectos</h2>
        <p className="mt-4 max-w-2xl text-lg text-white/60">
          Aquí irán tus proyectos destacados. Este header 3D es el primero de ellos.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {['Proyecto uno', 'Proyecto dos', 'Proyecto tres'].map((t) => (
            <div
              key={t}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-violet-400/60"
            >
              <h3 className="text-xl font-medium">{t}</h3>
              <p className="mt-2 text-sm text-white/50">Descripción breve del proyecto.</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
