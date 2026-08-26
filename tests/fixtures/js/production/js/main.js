let mySimpleAdditionFunction = (a, b) => a + b;

console.log(`2 + 5 = ${mySimpleAdditionFunction(2, 5)}`);

(function() {
    window.testFlag = true;
    window.sum = mySimpleAdditionFunction;
})();
