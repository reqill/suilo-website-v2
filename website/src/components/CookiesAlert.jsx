import React, { useState, useEffect } from "react";

const CookiesAlert = () => {
  const [isOpen, setIsOpen] = useState(null)
  // user agreed to cookies policy
  const _cookieAgree = () => {
    //action
    localStorage.setItem("cookiesEnabled", "true");
    setIsOpen(false)
  };

  // user disagreed with cookies policy
  const _cookieDisagree = () => {
    //action
    localStorage.setItem("cookiesEnabled", "false");
    setIsOpen(false)
  };

  useEffect(() => {
    console.log("POKAZAC POWIADOMIENIE O COOKIES:" + isOpen)
  }, [isOpen])

  if (isOpen === null) { //IDK WHY IT DOESNT WORK FIX OR CHECK PLS
    console.log("ZGODA NA COOKIES:" + Boolean(localStorage.getItem("cookiesEnabled")))
    setIsOpen(Boolean(!localStorage.getItem("cookiesEnabled")))
    return null;
  }
  return (
    <div className={`flex flex-col fixed bottom-0 align-middle justify-between p-5 pt-6 md:pt-5 bg-white w-screen rounded-t-3xl drop-shadow-2xl z-50 sm:w-11/12 md:flex-row md:w-fit md:p-6 lg:p-7 animate-all duration-300 ${isOpen ? "translate-y-0" : "translate-y-full"}`}>
      <div className="flex flex-col justify-center md:mr-6 align-top">
        <p className="text-text2 font-medium pb-1 text-md text-center md:text-left">
          Strona używa plików cookies i wymaga zgody na poprawne jej
          funkcjonowanie.
        </p>
        <p className="text-text3 font-normal text-sm pt-1 text-center pb-4 md:text-left md:pb-0">
          psst... przechowujemy tylko informacje o sesji logowania
        </p>
      </div>
      <div className="flex flex-row-reverse md:flex-col justify-center align-middle">
        <button className="cursor-pointer px-5 py-2 bg-gradient-to-br from-primary to-secondary text-white rounded-2lg drop-shadow-sm hover:drop-shadow-md transition-all duration-200 active:shadow-sm" onClick={() => _cookieAgree()}>
          <p className="my-px whitespace-nowrap font-regular">Wyrażam zgodę</p>
        </button>
        <button className="cursor-pointer mt-3 mr-4 md:mr-0 lg:mt-4 lg:-mb-3 group" onClick={() => _cookieDisagree()}>
          <p className="my-px text-sm text-center text-primary whitespace-nowrap transition group-hover:text-amber-600">Nie wyrażam zgody</p>
        </button>
      </div>
    </div>
  );
};

export default CookiesAlert;
