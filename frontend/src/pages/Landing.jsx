import "../assets/css/Landing.css";
import { motion } from "motion/react";
import NuevoCliente from "../components/FormLeads";

export default function Landing() {
    return (
        <div className="landing-layout">
            <section className="landing-container">
                <div className="landing-title-container">
                    <motion.h1
                    initial= {{ opacity: 0 }}
                    animate={{ opacity: 1 , scale: [1, 1.2, 1] }}
                    transition={{ duration: 1 }}
                    >BONO DE BIENVENIDA</motion.h1>
                    <motion.span className="landing-bono"
                    animate={{ opacity: 1, scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 1, repeat: 10, repeatDelay: 1 }}
                    >🎁 100% 🎁</motion.span>
                    <h2>REGISTRATE AHORA Y <br /><span className="keyword">DUPLICAMOS</span> TU DEPÓSITO</h2>
                </div>
                <NuevoCliente />
                <motion.span className="landing-disclaimer"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                >+18 | Juega responsablemente | Se aplican Terminos y Condiciones</motion.span>
            </section>
        </div>
    );
}
