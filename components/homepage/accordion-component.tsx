// AccordionComponent.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Adjust your import path
import { TITLE_TAILWIND_CLASS } from "@/utils/constants";

export function AccordionComponent() {
  const faqs = [
    {
      id: 1,
      question: "Can I connect multiple databases with Deltabase?",
      answer:
        "Absolutely, Deltabase supports multiple database connections including MySQL, PostgreSQL, MongoDB, and more.",
    },
    {
      id: 2,
      question: "Is AI-powered query assistance available?",
      answer:
        "Yes, our AI-powered query assistant helps users with query suggestions and automates complex query tasks.",
    },
    {
      id: 3,
      question: "How secure is my data on Deltabase?",
      answer:
        "We take data security very seriously, implementing state-of-the-art encryption and access controls.",
    },
  ];
  return (
    <div className="flex flex-col items-center px-80 py-6 w-full">
      <h2
        className={`${TITLE_TAILWIND_CLASS} mt-2 text-center font-semibold tracking-tight text-gray-900 dark:text-white`}
      >
        Frequently Asked Questions (FAQs)
      </h2>
      <Accordion type="single" collapsible className="w-full mt-4">
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={`item-${faq.id}`}>
            <AccordionTrigger>
              <span className="font-medium">{faq.question}</span>
            </AccordionTrigger>
            <AccordionContent>
              <p>{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
