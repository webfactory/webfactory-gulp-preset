interface Point {
    x: number;
    y: number;
}

function add(p: Point): number {
    return p.x + p.y;
}

console.log(add({ x: 1, y: 2 }));
