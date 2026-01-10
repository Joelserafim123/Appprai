// Defines custom error types for more specific error handling, especially for Firestore permissions.

export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete';
    requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
    public context: SecurityRuleContext;

    constructor(context: SecurityRuleContext) {
        const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`;
        super(message);
        this.name = 'FirestorePermissionError';
        this.context = context;

        // This is to make the error object serializable and visible in Next.js error overlays
        Object.setPrototypeOf(this, FirestorePermissionError.prototype);
    }
}
