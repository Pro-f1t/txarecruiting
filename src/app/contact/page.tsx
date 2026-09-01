import ContactDetails from "@/components/ContactDetails";

export default function ContactPage() {
  return (
    <section className="shell pt-28 pb-24">
      <p className="t-eyebrow">Contact</p>
      <div className="mt-6">
        <ContactDetails />
      </div>
    </section>
  );
}
