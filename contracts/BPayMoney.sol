//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BPayMoney is ERC20 {
    uint constant _initial_supply = 100 * (10 ** 18);

    constructor() ERC20("BPayUSDC", "USDC") {
        _mint(msg.sender, 10000000000000000000000);
    }

    function mint(address account) external {
        _mint(account, 10000000000000000000000);
    }
}
