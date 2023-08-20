let serial="´=:06Y9310100000000XP2520678712V812762921T4323200000000600"

console.log(serial.length);
//Answer: 58

let numero_parte=serial.substring(21,21+8)

console.log(numero_parte);
//Answer: 25206787

let numero_serie=serial.slice(-14);

console.log(numero_serie);
//Answer:23200000000600

