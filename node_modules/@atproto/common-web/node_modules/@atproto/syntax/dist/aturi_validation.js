"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidAtUriError = void 0;
exports.isAtUriString = isAtUriString;
exports.ifAtUriString = ifAtUriString;
exports.asAtUriString = asAtUriString;
exports.assertAtUriString = assertAtUriString;
exports.ensureValidAtUri = ensureValidAtUri;
exports.ensureValidAtUriRegex = ensureValidAtUriRegex;
exports.isValidAtUri = isValidAtUri;
exports.parseAtUriString = parseAtUriString;
const at_identifier_js_1 = require("./at-identifier.js");
const result_js_1 = require("./lib/result.js");
const nsid_js_1 = require("./nsid.js");
const recordkey_js_1 = require("./recordkey.js");
/**
 * Type guard that checks if a value is a valid {@link AtUriString}
 *
 * @see {@link AtUriString}
 */
function isAtUriString(input, options) {
    return parseAtUriString(input, options).success;
}
/**
 * Returns the input if it is a valid {@link AtUriString} format string, or
 * `undefined` if it is not.
 *
 * @see {@link AtUriString}
 */
function ifAtUriString(input, options) {
    return isAtUriString(input, options) ? input : undefined;
}
/**
 * Casts a string to an {@link AtUriString} if it is a valid AT URI format
 * string, throwing an error if it is not.
 *
 * @throws InvalidAtUriError if the input string does not meet the atproto AT URI format requirements.
 * @see {@link AtUriString}
 */
function asAtUriString(input, options) {
    assertAtUriString(input, options);
    return input;
}
/**
 * Assert the validity of an {@link AtUriString}, throwing an error if the
 * {@link input} is not a valid AT URI.
 *
 * @throws InvalidAtUriError if the {@link input} is not a valid {@link AtUriString}
 */
function assertAtUriString(input, options) {
    // Optimistically use faster isAtUriString(), throwing a detailed error only
    // in case of failure. This check, and the fact that the code after it always
    // throws, also ensures that isAtUriString() and assertAtUriString()'s
    // behavior are always consistent.
    const result = parseAtUriString(input, options);
    if (!result.success) {
        throw new InvalidAtUriError(result.message);
    }
}
/**
 * Assert the **non-strict** validity of an {@link AtUriString}, throwing a
 * detailed error if the {@link input} is not a valid AT URI.
 *
 * @throws InvalidAtUriError if the {@link input} is not a valid {@link AtUriString}
 * @deprecated use {@link assertAtUriString} with `{ strict: false }` option instead
 */
function ensureValidAtUri(input) {
    assertAtUriString(input, { strict: false, detailed: true });
}
/**
 * Assert the (non-strict!) validity of an {@link AtUriString}, throwing an
 * error if the {@link input} is not a valid AT URI.
 *
 * @throws InvalidAtUriError if the {@link input} is not a valid {@link AtUriString}
 * @deprecated use {@link assertAtUriString} with `{ strict: false }` option instead
 */
function ensureValidAtUriRegex(input) {
    assertAtUriString(input, { strict: false, detailed: false });
}
/**
 * Type guard that checks if a value is a valid {@link AtUriString} format
 * string, without enforcing strict record key validation. This is useful for
 * cases where you want to allow a wider range of valid ATURIs, such as when
 * validating user input or when the record key is not relevant.
 *
 * @deprecated use {@link isAtUriString} with `{ strict: false }` option instead
 */
function isValidAtUri(input) {
    return isAtUriString(input, { strict: false });
}
class InvalidAtUriError extends Error {
}
exports.InvalidAtUriError = InvalidAtUriError;
const INVALID_CHAR_REGEXP = /[^a-zA-Z0-9._~:@!$&'()*+,;=%/\\[\]#?-]/;
const AT_URI_REGEXP = /^(?<uri>at:\/\/(?<authority>[^/?#\s]+)(?:\/(?<collection>[^/?#\s]+)(?:\/(?<rkey>[^/?#\s]+))?)?(?<trailingSlash>\/)?)(?:\?(?<query>[^#\s]*))?(?:#(?<hash>[^\s]*))?$/;
/**
 * Parses a valid {@link AtUriString} into a {@link AtUriParts} object, or
 * returns a failure with a detailed error message if the string is not a valid
 * {@link AtUriString}.
 */
function parseAtUriString(input, options) {
    if (typeof input !== 'string') {
        return (0, result_js_1.failure)('ATURI must be a string');
    }
    if (input.length > 8192) {
        return (0, result_js_1.failure)('ATURI exceeds maximum length');
    }
    const invalidChar = input.match(INVALID_CHAR_REGEXP);
    if (invalidChar) {
        return (0, result_js_1.failure)('Disallowed characters in ATURI (ASCII)');
    }
    const match = input.match(AT_URI_REGEXP);
    const groups = match?.groups;
    if (!groups) {
        // Regex validation failed, but we don't know exactly why. Provide more
        // detailed error messages if the "detailed" option is set, falling back to
        // a generic error.
        if (options?.detailed) {
            if (!input.startsWith('at://')) {
                return (0, result_js_1.failure)('ATURI must start with "at://"');
            }
            if (input.includes(' ')) {
                return (0, result_js_1.failure)('ATURI can not contain spaces');
            }
            if (input.includes('//', 5)) {
                return (0, result_js_1.failure)('ATURI can not have empty path segments');
            }
            const pathStart = input.indexOf('/', 5); // after "at://"
            if (pathStart !== -1) {
                const fragmentIndex = input.indexOf('#');
                const pathEnd = fragmentIndex !== -1 ? fragmentIndex : input.length;
                const secondSlash = input.indexOf('/', pathStart + 1);
                if (secondSlash !== -1 && secondSlash !== pathEnd - 1) {
                    return (0, result_js_1.failure)('ATURI can not have more than two path segments');
                }
            }
        }
        return (0, result_js_1.failure)('ATURI does not match expected format');
    }
    // @NOTE Percent-encoding is allowed by the AT URI specification, but any
    // percent-encoded characters appearing in the collection NSID or record key
    // will effectively be rejected by the isValidNsid and isValidRecordKey
    // validators. Since these values are defined to be plain ASCII identifiers,
    // this legacy behavior is beneficial: it ensures that normalized
    // (non-percent-encoded) values are always used, as prescribed by the spec.
    if (!(0, at_identifier_js_1.isAtIdentifierString)(groups.authority)) {
        return (0, result_js_1.failure)('ATURI has invalid authority');
    }
    if (groups.collection != null && !(0, nsid_js_1.isValidNsid)(groups.collection)) {
        return (0, result_js_1.failure)('ATURI has invalid collection');
    }
    if (groups.hash != null) {
        const result = parseJsonPointer(groups.hash, options);
        if (result.success) {
            groups.hash = result.value;
        }
        else {
            return (0, result_js_1.failure)(`ATURI has invalid fragment (${result.message})`);
        }
    }
    if (options?.strict !== false) {
        if (groups.trailingSlash != null) {
            return (0, result_js_1.failure)('ATURI can not have a trailing slash');
        }
        if (groups.query != null) {
            return (0, result_js_1.failure)('ATURI query part is not allowed');
        }
        if (groups.rkey != null && !(0, recordkey_js_1.isValidRecordKey)(groups.rkey)) {
            return (0, result_js_1.failure)('ATURI has invalid record key');
        }
    }
    return (0, result_js_1.success)(groups);
}
const BASIC_JSON_POINTER_REGEXP = /^\/[a-zA-Z0-9._~:@!$&')(*+,;=%[\]/-]*$/;
/**
 * Checks if a string is a valid JSON pointer (RFC-6901) with the allowed chars
 * for ATURI fragments. This is a very loose validation that only checks the
 * basic syntax and charset.
 */
function parseJsonPointer(value, options) {
    if (!BASIC_JSON_POINTER_REGEXP.test(value)) {
        return (0, result_js_1.failure)('Invalid JSON pointer');
    }
    const result = parsePercentEncoding(value);
    // In non-strict mode, we allow invalid percent-encoding in the fragment
    if (!result.success && options?.strict === false) {
        return (0, result_js_1.success)(value);
    }
    return result;
}
function parsePercentEncoding(value) {
    try {
        return (0, result_js_1.success)(decodeURIComponent(value));
    }
    catch {
        // decodeURIComponent throws if the percent-encoding is invalid (e.g. "%FF")
        return (0, result_js_1.failure)('Invalid percent-encoding');
    }
}
//# sourceMappingURL=aturi_validation.js.map