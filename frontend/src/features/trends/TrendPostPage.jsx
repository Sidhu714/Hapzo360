
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
} from "lucide-react";

const posts = {
  "garment-manufacturing": {
    category: "Garments & Textiles",
    title: "Garment manufacturing is changing",
    description:
      "A closer look at production work, essential skills and opportunities across the garment industry.",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1800&q=85",
    date: "Industry guide",
    readTime: "5 min read",
    sections: [
      {
        heading: "An industry built on practical skills",
        paragraphs: [
          "Garment manufacturing brings together fabric preparation, cutting, stitching, finishing and quality inspection. Each stage plays an important role in turning raw materials into finished products.",
          "For job seekers, understanding how these stages connect can help identify suitable roles and the skills employers may expect.",
        ],
      },
      {
        heading: "Roles worth exploring",
        paragraphs: [
          "Depending on experience and training, opportunities may include sewing machine operator, cutting assistant, garment checker, finishing operator, production assistant and quality inspector.",
          "Supervisory and technical positions may require additional experience with production planning, machine maintenance, workflow coordination or quality standards.",
        ],
      },
      {
        heading: "Skills that can help you stand out",
        paragraphs: [
          "Attention to detail, consistent workmanship, safe machine operation, teamwork and punctuality are valuable foundations. Learning to identify common garment defects can also help workers contribute to quality control.",
          "As you gain experience, consider developing skills in production reporting, inventory tracking and digital documentation.",
        ],
      },
      {
        heading: "How to take the next step",
        paragraphs: [
          "Start by identifying the type of work you want to do. Review job descriptions carefully, note the experience and training requirements, and prepare a simple resume that highlights relevant skills.",
          "Explore openings on Hapzo and compare the responsibilities, location and requirements before applying.",
        ],
      },
    ],
  },

  "skilled-operators": {
    category: "Manufacturing",
    title: "Skilled operators remain essential",
    description:
      "Understand the practical abilities behind safe, consistent and efficient manufacturing.",
    image:
      "https://images.unsplash.com/photo-1567789884554-0b844b597180?auto=format&fit=crop&w=1800&q=85",
    date: "Skills guide",
    readTime: "4 min read",
    sections: [
      {
        heading: "What does a machine operator do?",
        paragraphs: [
          "Machine operators help run production equipment, monitor output, follow operating procedures and identify problems that require attention.",
          "The exact responsibilities depend on the equipment, industry and level of experience.",
        ],
      },
      {
        heading: "Skills employers may look for",
        paragraphs: [
          "Equipment familiarity, safety awareness, attention to detail, basic troubleshooting and the ability to follow instructions are useful foundations.",
          "Experienced operators may also support production targets, routine checks and training for new team members.",
        ],
      },
      {
        heading: "Building your experience",
        paragraphs: [
          "Look for appropriate training and supervised opportunities to practise operating equipment. Learn the safety procedures relevant to your workplace and keep a record of the equipment and tasks you have experience with.",
        ],
      },
    ],
  },

  "digital-skills": {
    category: "Technology",
    title: "Digital skills meet everyday work",
    description:
      "See how basic digital tools can support office, factory and operations roles.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=85",
    date: "Career guide",
    readTime: "4 min read",
    sections: [
      {
        heading: "Digital tools are part of everyday work",
        paragraphs: [
          "Many workplaces use digital tools to maintain records, track inventory, prepare reports and communicate between teams.",
          "You do not need to become a software engineer to benefit from learning these tools.",
        ],
      },
      {
        heading: "Where to start",
        paragraphs: [
          "Practise spreadsheets, email, document preparation, accurate data entry and basic file management. These skills can be useful in administrative, warehouse and production-support roles.",
        ],
      },
      {
        heading: "Make learning practical",
        paragraphs: [
          "Try creating a simple stock register, attendance sheet or daily production report. Practical exercises help you understand how digital skills apply to real workplace tasks.",
        ],
      },
    ],
  },

  "logistics-careers": {
    category: "Logistics",
    title: "From warehouse to delivery",
    description:
      "Explore the people and processes that keep goods moving through the supply chain.",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=85",
    date: "Industry guide",
    readTime: "4 min read",
    sections: [
      {
        heading: "How logistics work fits together",
        paragraphs: [
          "Logistics connects receiving, storage, inventory control, order preparation, dispatch and delivery. Effective coordination helps goods reach their destinations.",
        ],
      },
      {
        heading: "Roles across the supply chain",
        paragraphs: [
          "Entry-level opportunities may include warehouse assistant, inventory associate, packing assistant and dispatch assistant. More experienced workers may move into coordination or supervisory positions.",
        ],
      },
      {
        heading: "Skills for getting started",
        paragraphs: [
          "Accuracy, organisation, teamwork, safe handling practices and basic inventory software knowledge can help. Depending on the role, employers may also require specific training or licences.",
        ],
      },
    ],
  },
};

export default function TrendPostPage() {
  const { slug } = useParams();
  const post = posts[slug];

  if (!post) {
    return (
      <main className="min-h-[60vh] bg-[#fbfcf8] px-5 py-24 text-center text-[#20372a]">
        <h1 className="text-3xl font-extrabold">Article not found</h1>
        <p className="mt-3 text-stone-500">
          This article may have been moved or does not exist.
        </p>
        <Link
          to="/services/trends"
          className="mt-6 inline-flex items-center gap-2 font-bold"
        >
          <ArrowLeft size={18} />
          Back to trends
        </Link>
      </main>
    );
  }

  return (
    <main className="bg-[#fbfcf8] text-[#20372a]">
      <div className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8">
        <Link
          to="/services/trends"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#66806c] transition hover:text-[#20372a]"
        >
          <ArrowLeft size={17} />
          All trends
        </Link>

        <header className="pb-9 pt-10">
          <span className="inline-flex rounded-full bg-[#eaf1df] px-4 py-2 text-xs font-bold text-[#315844]">
            {post.category}
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-[-.045em] sm:text-5xl md:text-6xl">
            {post.title}
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-stone-500 sm:text-lg">
            {post.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-5 border-y border-[#e3e8dc] py-4 text-sm text-stone-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={16} />
              {post.date}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 size={16} />
              {post.readTime}
            </span>
          </div>
        </header>

        <div className="overflow-hidden rounded-[24px]">
          <img
            src={post.image}
            alt={post.title}
            className="max-h-[480px] min-h-[260px] w-full object-cover"
          />
        </div>

        <article className="mx-auto mt-10 max-w-3xl">
          {post.sections.map((section, index) => (
            <section key={section.heading} className="mb-10">
              <span className="font-mono text-sm font-bold text-[#8ca76b]">
                / {String(index + 1).padStart(2, "0")}
              </span>

              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {section.heading}
              </h2>

              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-base leading-8 text-stone-600"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>

        <div className="mt-14 rounded-[24px] bg-[#20372a] p-7 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#d4e99b]">
            Take the next step
          </p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            Put your skills to work.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
            Explore job opportunities and find roles that match your
            interests and experience.
          </p>
          <Link
            to="/services/openings"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d4e99b] px-5 py-3.5 text-sm font-bold text-[#20372a] transition hover:bg-white"
          >
            Explore jobs
            <ArrowUpRight size={17} />
          </Link>
        </div>

        <div className="mt-8">
          <Link
            to="/services/trends"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#315844] hover:text-[#66806c]"
          >
            <ArrowLeft size={17} />
            Explore more trends
          </Link>
        </div>
      </div>
    </main>
  );
}
