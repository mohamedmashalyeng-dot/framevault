import { Contact } from "./components/Contact";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Process } from "./components/Process";
import { Studio } from "./components/Studio";
import { Work } from "./components/Work";

export default function App() {
  return (
    <>
      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <Header />
      <main>
        <Hero />
        <Work />
        <Studio />
        <Process />
        <Contact />
      </main>
      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-10 text-sm text-ink-soft">
          <span className="font-serif text-lg text-ink">Meridian</span>
          <span>Studio 4, The Print Works · Open by appointment</span>
          <span>© {new Date().getFullYear()} Meridian Architects</span>
        </div>
      </footer>
    </>
  );
}
