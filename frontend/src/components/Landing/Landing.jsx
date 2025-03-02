import React from 'react';
import { ArrowRight, Clock, MapPin, Phone, Mail, Coffee, Users, Gift, Briefcase, Package, Dog, Menu } from 'lucide-react';

const Landing = () => {
  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="bg-emerald-800 text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl md:text-2xl">Casa en el Árbol</span>
          </div>
          <div className="hidden md:flex space-x-6">
            <a href="#inicio" className="hover:text-amber-200 transition">Inicio</a>
            <a href="#nosotros" className="hover:text-amber-200 transition">Nosotros</a>
            <a href="#servicios" className="hover:text-amber-200 transition">Servicios</a>
            <a href="#horarios" className="hover:text-amber-200 transition">Horarios</a>
            <a href="#contacto" className="hover:text-amber-200 transition">Contacto</a>
          </div>
          <div className="md:hidden">
            <button className="p-1">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Background Image */}
      <section id="inicio" className="relative text-white">
        {/* Background image div */}
        <div className="absolute inset-0 bg-black/30 z-10"></div>
        <div className="relative w-full h-96 md:h-screen max-h-[600px] overflow-hidden">
          <img 
            src="/api/placeholder/1200/600" 
            alt="Casa en el Árbol - Parque infantil" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60 z-10"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white text-center uppercase tracking-wider">
              LA CASA EN EL ÁRBOL
            </h1>
          </div>
        </div>
        
        {/* Wave-like separator */}
        <div className="absolute bottom-0 left-0 right-0 h-16 z-20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
            <path fill="#ffffff" fillOpacity="1" d="M0,96L80,128C160,160,320,224,480,229.3C640,235,800,181,960,165.3C1120,149,1280,171,1360,181.3L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
          </svg>
        </div>
        
        {/* Logo overlay */}
        <div className="relative mx-auto max-w-lg -mt-16 z-30 flex justify-center">
          <div className="bg-white p-4 rounded-full shadow-lg">
            <img 
              src="/api/placeholder/120/120" 
              alt="Logo Casa en el Árbol" 
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>
        
        {/* Services tags */}
        <div className="relative bg-white py-12 z-20">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-3 mb-8 text-sm md:text-base mt-12">
              <span className="bg-amber-600 text-white px-3 py-1 rounded-full flex items-center shadow-md">
                <Users size={18} className="mr-1" /> Parque de roles para niños
              </span>
              <span className="bg-rose-600 text-white px-3 py-1 rounded-full flex items-center shadow-md">
                <Gift size={18} className="mr-1" /> Fiestas Infantiles
              </span>
              <span className="bg-sky-600 text-white px-3 py-1 rounded-full flex items-center shadow-md">
                <Package size={18} className="mr-1" /> Piscina de pelotas
              </span>
              <span className="bg-indigo-600 text-white px-3 py-1 rounded-full flex items-center shadow-md">
                <Briefcase size={18} className="mr-1" /> Coworking
              </span>
              <span className="bg-red-700 text-white px-3 py-1 rounded-full flex items-center shadow-md">
                <Coffee size={18} className="mr-1" /> Zona de café
              </span>
              <span className="bg-emerald-700 text-white px-3 py-1 rounded-full flex items-center shadow-md">
                <Dog size={18} className="mr-1" /> Pet Friendly
              </span>
            </div>
            <div className="text-center">
              <a href="#contacto" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-full transition flex items-center mx-auto w-fit shadow-md">
                ¡Reserva ahora! <ArrowRight size={18} className="ml-2" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Información Section */}
      <section id="horarios" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-stone-800 uppercase">
            Información
          </h2>
          <div className="w-32 h-1 bg-amber-600 mx-auto mb-12"></div>
          
          <p className="text-center text-lg text-stone-700 mb-12 max-w-3xl mx-auto">
            Torre L - Ofiespacio 253 - 254, lunes a viernes de 11:00 A.M - 6:00 P.M, sábado a domingo de 10:00 A.M a 7:00 P.M, festivos 11:00 A.M a 6:00 P.M.
          </p>
          
          <div className="flex justify-center space-x-8 md:space-x-16 mt-12">
            <a href="#" className="flex flex-col items-center group">
              <div className="w-16 h-16 flex items-center justify-center bg-amber-200 rounded-md mb-2 group-hover:bg-amber-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </div>
              <span className="text-stone-700">Instagram</span>
            </a>
            
            <a href="#" className="flex flex-col items-center group">
              <div className="w-16 h-16 flex items-center justify-center bg-amber-200 rounded-md mb-2 group-hover:bg-amber-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </div>
              <span className="text-stone-700">Facebook</span>
            </a>
            
            <a href="#" className="flex flex-col items-center group">
              <div className="w-16 h-16 flex items-center justify-center bg-amber-200 rounded-md mb-2 group-hover:bg-amber-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
              <span className="text-stone-700">WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className="py-16 bg-stone-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-stone-800 uppercase">Descripción</h2>
          <div className="w-32 h-1 bg-amber-600 mx-auto mb-12"></div>
          <div className="max-w-3xl mx-auto text-lg text-stone-700">
            <p className="mb-6">
              Camilo y Katherine, queremos invitarlos a ser parte de esta gran familia. Nuestros hijos, Jerónimo y Victoria, 
              son los primeros compañeritos que sus pequeños van a tener; por eso hemos creado La casa en el árbol 
              "Stay, play & café" con la comodidad para tu descanso y/o para que compartas tiempo con tus hijos aprendiendo y jugando.
            </p>
            <p className="mb-6">
              ¡Ven y forma parte de esta gran familia! La alegría, la creatividad, la seguridad, la variedad y la diversión 
              son los mejores ingredientes para disfrutar momentos inolvidables en este lugar.
            </p>
            <p className="mb-6">
              Podemos ofrecerte, playground, café, fiestas infantiles, niñeras, talleres y salidas pedagógicas.
            </p>
            <div className="text-center mt-8">
              <a href="#servicios" className="text-emerald-700 font-bold hover:text-emerald-800 flex items-center justify-center group">
                Descubre nuestros servicios <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-stone-800 uppercase">Nuestros Servicios</h2>
          <div className="w-32 h-1 bg-amber-600 mx-auto mb-12"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Playground */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-md hover:shadow-lg transition group">
              <div className="bg-amber-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-stone-800">Playground</h3>
              <p className="text-stone-600">Espacio seguro y divertido para que los niños jueguen y desarrollen sus habilidades motoras con diversas actividades.</p>
            </div>
            
            {/* Fiestas Infantiles */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-md hover:shadow-lg transition group">
              <div className="bg-rose-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Gift size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-stone-800">Fiestas Infantiles</h3>
              <p className="text-stone-600">Celebra el cumpleaños de tus hijos con nosotros. Ofrecemos paquetes personalizados para hacer de ese día algo inolvidable.</p>
            </div>
            
            {/* Piscina de Pelotas */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-md hover:shadow-lg transition group">
              <div className="bg-sky-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-stone-800">Piscina de Pelotas</h3>
              <p className="text-stone-600">Una divertida piscina llena de pelotas de colores donde los niños pueden saltar y jugar de forma segura.</p>
            </div>
            
            {/* Coworking */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-md hover:shadow-lg transition group">
              <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Briefcase size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-stone-800">Coworking</h3>
              <p className="text-stone-600">Espacio de trabajo cómodo para padres que necesitan trabajar mientras sus hijos juegan y se divierten.</p>
            </div>
            
            {/* Café */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-md hover:shadow-lg transition group">
              <div className="bg-red-700 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Coffee size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-stone-800">Zona de Café</h3>
              <p className="text-stone-600">Disfruta de deliciosas bebidas y snacks mientras tus hijos juegan o mientras trabajas en nuestra zona de coworking.</p>
            </div>
            
            {/* Talleres y Salidas */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-md hover:shadow-lg transition group">
              <div className="bg-emerald-700 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-stone-800">Talleres y Salidas Pedagógicas</h3>
              <p className="text-stone-600">Actividades educativas y recreativas que fomentan el aprendizaje y la socialización en los niños.</p>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <a href="#contacto" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-full transition inline-flex items-center shadow-md">
              ¡Reserva ahora para tu hijo! <ArrowRight size={18} className="ml-2 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-16 bg-emerald-800 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 uppercase">Contáctanos</h2>
          <div className="w-32 h-1 bg-amber-500 mx-auto mb-12"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white text-stone-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-emerald-700">Administración San Roque</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone size={20} className="mr-3 text-amber-600 mt-1" />
                  <div>
                    <p className="font-semibold">Teléfono:</p>
                    <p>301 580 8377</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail size={20} className="mr-3 text-amber-600 mt-1" />
                  <div>
                    <p className="font-semibold">Correo Electrónico:</p>
                    <p>gerencia.sanroque@multiplika.com.co</p>
                    <p>administrativo.sanroque@multiplika.com.co</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white text-stone-800 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-emerald-700">¿Quiere Más Información?</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Phone size={20} className="mr-3 text-amber-600 mt-1" />
                  <div>
                    <p className="font-semibold">Teléfono:</p>
                    <p>301 403 9324</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail size={20} className="mr-3 text-amber-600 mt-1" />
                  <div>
                    <p className="font-semibold">Correo Electrónico:</p>
                    <p>mercadeo.sanroque@multiplika.com.co</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin size={20} className="mr-3 text-amber-600 mt-1" />
                  <div>
                    <p className="font-semibold">Ubicación:</p>
                    <p>Km 7 Vía Cajicá – Chía</p>
                    <p>Entre la Universidad Manuela Beltrán y Toyota Novamotors</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 max-w-md mx-auto">
            <form className="bg-white rounded-lg shadow-md p-6 text-stone-800">
              <h3 className="text-xl font-bold mb-4 text-emerald-700">Envíanos un mensaje</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="name">Nombre completo</label>
                  <input type="text" id="name" className="w-full p-2 border border-stone-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="email">Correo electrónico</label>
                  <input type="email" id="email" className="w-full p-2 border border-stone-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="message">Mensaje</label>
                  <textarea id="message" rows="4" className="w-full p-2 border border-stone-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"></textarea>
                </div>
                <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-4 rounded transition shadow-md">
                  Enviar mensaje
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-800 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Casa en el Árbol</h3>
              <p className="mb-4 text-stone-300">Parque de diversiones y temático para toda la familia.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-white hover:text-amber-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-amber-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-amber-400 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4">Enlaces rápidos</h3>
              <ul className="space-y-2 text-stone-300">
                <li><a href="#inicio" className="hover:text-amber-400 transition-colors">Inicio</a></li>
                <li><a href="#nosotros" className="hover:text-amber-400 transition-colors">Descripción</a></li>
                <li><a href="#servicios" className="hover:text-amber-400 transition-colors">Servicios</a></li>
                <li><a href="#horarios" className="hover:text-amber-400 transition-colors">Información</a></li>
                <li><a href="#contacto" className="hover:text-amber-400 transition-colors">Contacto</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4">Nosotros</h3>
              <ul className="space-y-2 text-stone-300">
                <li><a href="#" className="hover:text-amber-400 transition-colors">Política de Cookies</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Políticas de tratamiento de Datos</a></li>
                <li><a href="#" className="hover:text-amber-400 transition-colors">Términos y Condiciones</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-stone-700 mt-8 pt-8 text-center text-stone-400">
            <p>&copy; {new Date().getFullYear()} Casa en el Árbol. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;