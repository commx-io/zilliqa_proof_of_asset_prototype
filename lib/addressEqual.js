const {validation} = require('@zilliqa-js/util');
const {fromBech32Address, toBech32Address} = require('@zilliqa-js/crypto');

function addressEqual(address_a, address_b) {
    let a = '';
    let b = '';
    if (validation.isBech32(address_a))
        a = fromBech32Address(address_a)
    else
        a = (address_a.substring(0,2) == '0x' ? address_a : '0x' + address_a);
    if (validation.isBech32(address_b))
        b = fromBech32Address(address_b)
    else
        b = (address_b.substring(0,2) == '0x' ? address_b : '0x' + address_b);
    return a.toLowerCase() == b.toLowerCase();
}

module.exports = {addressEqual};
// ES6 browser
// export {addressEqual};