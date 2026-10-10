import { permanentRedirect } from "next/navigation";

/** Waarom Werkly staat nu op de startpagina. Oude links en bladwijzers komen daar vanzelf uit. */
export default function WhyPage() {
  permanentRedirect("/#waarom");
}
