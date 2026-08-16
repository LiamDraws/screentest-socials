"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.failure = failure;
function success(value) {
    return { success: true, value };
}
function failure(message) {
    return { success: false, message };
}
//# sourceMappingURL=result.js.map