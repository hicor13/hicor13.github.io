#!/usr/bin/env python3
"""Builds the resume page (resume/index.html) and PDFs (resume.pdf ES, resume-en.pdf EN) from one source.

Edit CONTENT below, then run:  python3 tools/resume/build.py
Needs: pip install playwright; Chromium via `playwright install chromium` or CHROMIUM_PATH=/path/to/chromium.
Fonts (Cormorant Garamond + Lora) load from Google Fonts; pass --fonts-css FILE
to use local @font-face rules instead when offline.
"""
import argparse
import html
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "media" / "documents"

CONTENT = {
    "es": {
        "lang": "es",
        "file": "resume.pdf",
        "title": "Currículum de Mario Roy Cornejo Bellido",
        "tagline": "Gestión de Negocios y Análisis de Datos",
        "contact": ["Lima, Perú 15038", "+51 979 001 717", "cornejomariob@gmail.com", "linkedin.com/in/hicor13", "mariocornejo.com"],
        "citizenship": "Ciudadanía dual: EE. UU. y Perú  ·  Inglés y español nativos",
        "profile_h": "Perfil",
        "profile": (
            "Profesional con 3 años de experiencia en optimización de procesos operacionales y análisis "
            "empresarial. En INDRA Servicios redujo significativamente los tiempos de ciclo operacional sin "
            "presupuesto adicional. Formación en Administración de Negocios (certificada por SUNEDU), "
            "desarrollando Python y SQL. Nacido y con residencia previa en EE. UU.; doble ciudadanía "
            "(EE. UU. y Perú) y bilingüe nativo inglés–español. Mejor encaje: Growth Operations Specialist, "
            "Business Analyst u Operations Analyst."
        ),
        "edu_h": "Educación",
        "edu": [("Universidad Privada San Juan Bautista", "Ica, Perú",
                 "Licenciado en Administración de Negocios · certificado SUNEDU", "dic 2022")],
        "exp_h": "Experiencia",
        "exp": [
            ("CR Cobranzas", "Lima, Perú", "Digital Channels Assistant", "mar 2026 – presente", [
                "Automatización de reportería: migración de Excel Power Query a SQL + Python/scraping.",
                "Ejecución de estrategias de envíos masivos por canales digitales.",
                "Resolución de cuellos de botella en el flujo operativo."]),
            ("INDRA Servicios Perú", "Ica, Perú", "Quality Assurance Analyst", "oct 2025 – ene 2026", [
                "Validación técnica de Activos Digitales siguiendo protocolos establecidos.",
                "Diseño e implementación de varias optimizaciones al flujo de QA que en conjunto acortaron los tiempos.",
                "Mejoras aplicadas sobre el proceso manual existente, sin presupuesto ni herramientas adicionales."]),
            ("Clínica Veterinaria Mi Mascota", "Ica, Perú", "Administrative Assistant & Marketing Designer", "may 2022 – oct 2024", [
                "Elaboración de reportería gerencial para la toma de decisiones.",
                "Rediseño de branding y gestión de redes sociales."]),
            ("Marketing Alterno", "Ica, Perú", "Supervision & Coordination Specialist", "nov – dic 2024", []),
            ("Hotel Matryoshka", "Ica, Perú", "Front Desk Receptionist", "dic 2019 – mar 2020", []),
        ],
        "cert_h": "Certificaciones",
        "certs": ["Inglés B2 First (Cambridge)", "MOS Associate <em>(en progreso)</em>",
                  "CS50 SQL, Harvard <em>(módulo 2)</em>", "Japonés Básico I <em>(APJ)</em>"],
        "skills_h": "Habilidades e intereses",
        "skills": [
            ("Técnico", "Excel avanzado, Power Query, Google Workspace, Adobe CC, Claude Code, Linux, Docker, "
                        "Python (básico), SQL (CS50 Harvard, módulo 2)"),
            ("Idiomas", "Inglés nativo (nacido y con residencia previa en EE. UU.), español nativo, japonés básico"),
        ],
    },
    "en": {
        "lang": "en",
        "file": "resume-en.pdf",
        "title": "Resume of Mario Roy Cornejo Bellido",
        "tagline": "Business Management & Data Analytics",
        "contact": ["Lima, Peru 15038", "+51 979 001 717", "cornejomariob@gmail.com", "linkedin.com/in/hicor13", "mariocornejo.com"],
        "citizenship": "Dual U.S. &amp; Peruvian citizen  ·  Native English and Spanish speaker",
        "profile_h": "Profile",
        "profile": (
            "Professional with 3 years of experience in operational process optimization and business "
            "analysis. At INDRA Servicios, significantly cut operational cycle times with no additional "
            "budget. Background in Business Administration (SUNEDU-certified), building Python and SQL "
            "skills. Born and previously lived in the United States; dual U.S.–Peruvian citizen and native "
            "English–Spanish bilingual. Best fit: Growth Operations Specialist, Business Analyst, or "
            "Operations Analyst."
        ),
        "edu_h": "Education",
        "edu": [("Universidad Privada San Juan Bautista", "Ica, Peru",
                 "Bachelor's in Business Administration · SUNEDU-certified", "Dec 2022")],
        "exp_h": "Experience",
        "exp": [
            ("CR Cobranzas", "Lima, Peru", "Digital Channels Assistant", "Mar 2026 – present", [
                "Reporting automation: migrated from Excel Power Query to SQL + Python/scraping.",
                "Ran mass-send strategies across digital channels.",
                "Resolved bottlenecks in the operational workflow."]),
            ("INDRA Servicios Peru", "Ica, Peru", "Quality Assurance Analyst", "Oct 2025 – Jan 2026", [
                "Technical validation of Digital Assets following established protocols.",
                "Designed and implemented several QA workflow optimizations that together shortened cycle times.",
                "Improvements applied to the existing manual process, with no additional budget or tooling."]),
            ("Clínica Veterinaria Mi Mascota", "Ica, Peru", "Administrative Assistant & Marketing Designer", "May 2022 – Oct 2024", [
                "Produced management reporting for decision-making.",
                "Redesigned branding and managed social media."]),
            ("Marketing Alterno", "Ica, Peru", "Supervision & Coordination Specialist", "Nov – Dec 2024", []),
            ("Hotel Matryoshka", "Ica, Peru", "Front Desk Receptionist", "Dec 2019 – Mar 2020", []),
        ],
        "cert_h": "Certifications",
        "certs": ["English B2 First (Cambridge)", "MOS Associate <em>(in progress)</em>",
                  "CS50 SQL, Harvard <em>(module 2)</em>", "Basic Japanese I <em>(APJ)</em>"],
        "skills_h": "Skills &amp; Interests",
        "skills": [
            ("Technical", "Advanced Excel, Power Query, Google Workspace, Adobe CC, Claude Code, Linux, Docker, "
                          "Python (basic), SQL (CS50 Harvard, module 2)"),
            ("Languages", "Native English (born and previously lived in the U.S.), native Spanish, basic Japanese"),
        ],
    },
}

CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: #fff; color: #222; font-family: 'Lora', serif; font-size: 9.2pt; line-height: 1.45;
       padding: 11mm 14mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-family: 'Cormorant Garamond', serif; font-weight: 500; font-size: 25pt; letter-spacing: .09em;
     text-transform: uppercase; text-align: center; margin: 0; line-height: 1.15; }
.tagline { text-align: center; font-size: 7pt; letter-spacing: .3em; text-transform: uppercase; color: #555; margin: 2mm 0 2.5mm; }
.contact { text-align: center; font-size: 8pt; margin: 0; }
.contact span + span::before { content: '\\2022'; margin: 0 7px; }
.citizen { text-align: center; font-size: 8pt; margin: 1mm 0 0; font-style: italic; color: #444; }
h2 { font-family: 'Cormorant Garamond', serif; font-weight: 500; font-size: 9pt; letter-spacing: .2em;
     text-transform: uppercase; margin: 4.4mm 0 2mm; padding-bottom: .8mm; border-bottom: .6pt solid #222; }
p { margin: 0; }
.row { display: flex; justify-content: space-between; gap: 8mm; }
.row .r { white-space: nowrap; text-align: right; }
.org { font-weight: 600; }
.role { font-style: italic; }
.job { margin-bottom: 2mm; }
.job.nb { margin-bottom: 1.8mm; }
ul { margin: 1mm 0 0; padding-left: 4.6mm; }
li { margin: 0; }
.skills p + p { margin-top: .8mm; }
"""


def esc(s):
    return html.escape(s, quote=False)


def render(c, fonts_css):
    contact = "".join(f"<span>{esc(x)}</span>" for x in c["contact"])
    edu = "".join(
        f'<div class="row"><span class="org">{esc(o)}</span><span class="r">{esc(loc)}</span></div>'
        f'<div class="row"><span class="role">{esc(d)}</span><span class="r">{esc(dt)}</span></div>'
        for o, loc, d, dt in c["edu"])
    jobs = ""
    for org, loc, role, dt, bullets in c["exp"]:
        ul = "<ul>" + "".join(f"<li>{esc(b)}</li>" for b in bullets) + "</ul>" if bullets else ""
        jobs += (f'<div class="job{"" if bullets else " nb"}">'
                 f'<div class="row"><span class="org">{esc(org)}</span><span class="r">{esc(loc)}</span></div>'
                 f'<div class="row"><span class="role">{esc(role)}</span><span class="r">{esc(dt)}</span></div>{ul}</div>')
    certs = "<ul>" + "".join(f"<li>{x}</li>" for x in c["certs"]) + "</ul>"
    skills = "".join(f"<p><strong>{esc(k)}:</strong> {esc(v)}</p>" for k, v in c["skills"])
    return f"""<!doctype html><html lang="{c['lang']}"><head><meta charset="utf-8"><title>{esc(c['title'])}</title>
<style>{fonts_css}{CSS}</style></head><body>
<h1>Mario Roy Cornejo Bellido</h1>
<p class="tagline">{esc(c['tagline'])}</p>
<p class="contact">{contact}</p>
<p class="citizen">{c['citizenship']}</p>
<h2>{c['profile_h']}</h2><p>{esc(c['profile'])}</p>
<h2>{c['edu_h']}</h2>{edu}
<h2>{c['exp_h']}</h2>{jobs}
<h2>{c['cert_h']}</h2>{certs}
<h2>{c['skills_h']}</h2><div class="skills">{skills}</div>
</body></html>"""


PAGE_JSONLD = """{
	  "@context": "https://schema.org",
	  "@type": "ProfilePage",
	  "url": "https://www.mariocornejo.com/media/documents/resume/index.html",
	  "inLanguage": ["es", "en"],
	  "mainEntity": {
	    "@type": "Person",
	    "@id": "https://www.mariocornejo.com/#person",
	    "name": "Mario Roy Cornejo Bellido",
	    "alternateName": "Mario Cornejo",
	    "url": "https://www.mariocornejo.com/",
	    "image": "https://www.mariocornejo.com/assets/img/mario.jpg",
	    "jobTitle": "Business Analyst",
	    "email": "cornejomariob@gmail.com",
	    "nationality": [{ "@type": "Country", "name": "United States" }, { "@type": "Country", "name": "Peru" }],
	    "birthPlace": { "@type": "Country", "name": "United States" },
	    "knowsLanguage": ["en", "es", "ja"],
	    "address": { "@type": "PostalAddress", "addressLocality": "Lima", "addressCountry": "PE" },
	    "sameAs": ["https://linkedin.com/in/hicor13"]
	  }
	}"""


def bi(fn):
    """Wrap fn(content) for both languages in the site's data-i18n span pair (EN hidden by default)."""
    es, en = CONTENT["es"], CONTENT["en"]
    return (f'<span data-i18n-es lang="es">{fn(es)}</span>'
            f'<span data-i18n-en lang="en" hidden>{fn(en)}</span>')


def page_html():
    def rows(c):
        out = ""
        for o, loc, d, dt in c["edu"]:
            out += f'<div class="cv-row"><span>{esc(o)}, {esc(loc)}<br>{esc(d)}</span><span>{esc(dt)}</span></div>'
        return out

    def jobs(c):
        out = ""
        for org, loc, role, dt, bullets in c["exp"]:
            ul = "<ul>" + "".join(f"<li>{esc(b)}</li>" for b in bullets) + "</ul>" if bullets else ""
            out += (f'<div class="cv-row"><span>{esc(role)} · {esc(org)}, {esc(loc)}{ul}</span>'
                    f'<span>{esc(dt)}</span></div>')
        return out

    contact = lambda c: " &nbsp;·&nbsp; ".join(
        f'<a href="mailto:{x}" class="plain">{x}</a>' if "@" in x else esc(x) for x in c["contact"])
    skills = lambda c: "".join(f"<p><strong>{esc(k)}:</strong> {esc(v)}</p>" for k, v in c["skills"])
    es = CONTENT["es"]
    return f"""<!doctype html>
<html lang="es-PE" data-lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Curriculum Vitae — Mario Cornejo</title>
	<meta name="description" content="Curriculum Vitae de Mario Roy Cornejo Bellido — Growth Operations Specialist / Business Analyst, Lima, Perú. Ciudadanía dual EE. UU. y Perú; inglés y español nativos. / Resume of Mario Roy Cornejo Bellido — Business Analyst, Lima, Peru; dual U.S. and Peruvian citizen, native English and Spanish.">
	<link rel="canonical" href="https://www.mariocornejo.com/media/documents/resume/index.html">
	<link rel="stylesheet" href="style.css?v=20261004a">
	<script type="application/ld+json">
	{PAGE_JSONLD}
	</script>
</head>
<body>
	<div class="viewer">
		<header>
			<h1>Mario Cornejo — {bi(lambda c: "Curriculum Vitae" if c["lang"] == "es" else "Resume")}</h1>
			<div class="actions">
				<button type="button" class="lang-toggle" id="lang-toggle" aria-label="Cambiar idioma / Switch language"><span class="l-es">ES</span> / <span class="l-en">EN</span></button>
				<a data-i18n-es lang="es" href="/media/documents/resume.pdf" download>Descargar PDF</a>
				<a data-i18n-en lang="en" hidden href="/media/documents/resume-en.pdf" download>Download PDF</a>
				<a data-i18n-es lang="es" href="/media/documents/resume.pdf" target="_blank" rel="noopener">Abrir PDF</a>
				<a data-i18n-en lang="en" hidden href="/media/documents/resume-en.pdf" target="_blank" rel="noopener">Open PDF</a>
			</div>
		</header>
		<main>
			<p class="cv-name">MARIO ROY CORNEJO BELLIDO</p>
			<p class="cv-tagline">{bi(lambda c: esc(c["tagline"]))}</p>
			<p class="cv-meta">
				{bi(contact)}
			</p>
			<p class="cv-meta cv-citizen">{bi(lambda c: c["citizenship"])}</p>

			<section class="cv-block">
				<h2>{bi(lambda c: c["profile_h"])}</h2>
				<p>{bi(lambda c: esc(c["profile"]))}</p>
			</section>

			<section class="cv-block">
				<h2>{bi(lambda c: c["edu_h"])}</h2>
				{bi(rows)}
			</section>

			<section class="cv-block">
				<h2>{bi(lambda c: c["exp_h"])}</h2>
				{bi(jobs)}
			</section>

			<section class="cv-block">
				<h2>{bi(lambda c: c["cert_h"])}</h2>
				<p>{bi(lambda c: " · ".join(c["certs"]))}</p>
			</section>

			<section class="cv-block">
				<h2>{bi(lambda c: c["skills_h"])}</h2>
				{bi(skills)}
			</section>
		</main>
	</div>
	<script>
		(function () {{
			var btn = document.getElementById('lang-toggle');
			var titles = {{ es: 'Curriculum Vitae — Mario Cornejo', en: 'Resume — Mario Cornejo' }};
			function apply(l) {{
				document.documentElement.lang = l === 'en' ? 'en' : 'es-PE';
				document.documentElement.dataset.lang = l;
				btn.dataset.lang = l;
				document.title = titles[l];
				document.querySelectorAll('[data-i18n-es]').forEach(function (e) {{ e.hidden = l !== 'es'; }});
				document.querySelectorAll('[data-i18n-en]').forEach(function (e) {{ e.hidden = l !== 'en'; }});
			}}
			var lang = 'es';
			try {{ var s = localStorage.getItem('lang'); if (s === 'en' || s === 'es') lang = s; }} catch (e) {{}}
			apply(lang);
			btn.addEventListener('click', function () {{
				lang = lang === 'es' ? 'en' : 'es';
				try {{ localStorage.setItem('lang', lang); }} catch (e) {{}}
				apply(lang);
			}});
		}})();
	</script>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonts-css", help="file with local @font-face rules (offline builds)")
    ap.add_argument("--out", default=str(OUT))
    a = ap.parse_args()
    if a.fonts_css:
        fonts_css = pathlib.Path(a.fonts_css).read_text()
        base = pathlib.Path(a.fonts_css).resolve().parent.as_uri() + "/"
    else:
        fonts_css = "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');"
        base = None
    out = pathlib.Path(a.out)
    (ROOT / "media" / "documents" / "resume" / "index.html").write_text(page_html())
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        for c in CONTENT.values():
            page = b.new_page()
            tmp = pathlib.Path(a.fonts_css).resolve().parent / f"_{c['lang']}.html" if a.fonts_css else None
            doc = render(c, fonts_css)
            if tmp:  # local file so relative font urls resolve
                tmp.write_text(doc)
                page.goto(tmp.as_uri())
            else:
                page.set_content(doc, wait_until="networkidle")
            page.evaluate("document.fonts.ready")
            page.pdf(path=str(out / c["file"]), format="A4", print_background=True, prefer_css_page_size=True)
            n = page.evaluate("Math.ceil(document.body.scrollHeight / (297 / 25.4 * 96))")
            print(c["file"], "pages≈", n)
        b.close()


if __name__ == "__main__":
    sys.exit(main())
