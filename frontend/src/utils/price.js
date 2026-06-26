/** Cena proizvoda na kartici — npr. 1.300,00 RSD */
export function formatProductPrice(value) {
  return `${Number(value).toLocaleString('sr-RS', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} RSD`
}
