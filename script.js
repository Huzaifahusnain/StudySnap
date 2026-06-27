const heroCard = document.querySelector(".hero-card");

document.addEventListener("mousemove", (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    document.body.style.setProperty("--mouse-x", x);
    document.body.style.setProperty("--mouse-y", y);

    if (heroCard) {
        const rotateX = (y - 0.5) * -8;
        const rotateY = (x - 0.5) * 8;

        heroCard.style.transform =
            `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }
});

document.addEventListener("mouseleave", () => {
    if (heroCard) {
        heroCard.style.transform =
            "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    }
});