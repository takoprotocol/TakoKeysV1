// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Proxy {
    // State variable to store the current proxy address
    address public proxy;
    bool public isProxyOn;

    // Event to be emitted when the proxy address is changed
    event ProxyChanged(address indexed newProxy);

    // Modifier to restrict function calls to the current proxy address
    modifier onlyProxy() {
        require(isProxyOn, "Proxy is not allowed");
        require(msg.sender == proxy, "Caller is not the proxy");
        _;
    }

    // Constructor to set the initial proxy address
    constructor(address _proxy) {
        require(_proxy != address(0), "Proxy address cannot be the zero address");
        proxy = _proxy;
        emit ProxyChanged(proxy);
    }

    // Function to change the proxy address, restricted to the current proxy
    function setProxy(address _newProxy) external onlyProxy {
        require(_newProxy != address(0), "New proxy address cannot be the zero address");
        proxy = _newProxy;
        emit ProxyChanged(proxy);
    }

    function turnOnProxy() external {
        require(msg.sender == proxy, "Caller is not the proxy");
        isProxyOn = true;
    }

    function turnOffProxy() external onlyProxy{
        isProxyOn = false;
    }
}
