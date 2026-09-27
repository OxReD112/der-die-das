/* Präpositionen chapter page — script. Markup: index.html · styles: praepositionen.css
   Each card opens its exercise. The ?v= in data-target is the exercise's refresh number:
   raise it when that exercise changes, together with the Home tile's praepositionen/?v= */

document.querySelectorAll("[data-target]").forEach(button => {
  button.addEventListener("click", () => {
    window.location.href = button.dataset.target;
  });
});
