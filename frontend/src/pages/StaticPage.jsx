export default function StaticPage({ title, children }) {
  return (
    <section className="page shell">
      <h1>{title}</h1>
      <p>{children}</p>
    </section>
  )
}
