package com.sttl.formbuilder.constant;

/**
 * Centralized API endpoint constants for the FormBuilder backend and frontend.
 * Contants are structured to be used in both RequestMapping (relative) 
 * and SecurityConfig (absolute).
 */
public class ApiEndpoints {

    public static final String API_V1 = "/api/v1";

    // --- Path Segments ---
    public static final String LOGIN = "/login";
    public static final String LOGOUT = "/logout";
    public static final String REGISTER = "/register";
    public static final String ME = "/me";
    public static final String DRAFT = "/draft";
    public static final String PUBLISH = "/publish";
    public static final String SUBMIT = "/submit";
    public static final String ARCHIVE = "/archive";
    public static final String REACTIVATE = "/reactivate";
    public static final String VISIBILITY = "/visibility";
    public static final String PERMISSIONS = "/permissions";
    public static final String FIELDS = "/fields";
    public static final String VALIDATIONS = "/validations";
    public static final String REORDER = "/reorder";
    public static final String LOOKUP = "/lookup";
    public static final String VERSIONS = "/versions";
    public static final String ACTIVATE = "/activate";
    public static final String EXPORT_CSV = "/export/csv";
    public static final String RESTORE = "/restore";
    public static final String SUBMISSIONS = "/submissions";
    public static final String PUBLISHED_LIST = "/published-list";
    public static final String BULK_DELETE = "/bulk-delete";
    public static final String BULK_RESTORE = "/bulk-restore";
    public static final String EXPORT = "/export";

    // --- Auth ---
    public static final String AUTH_BASE = "/auth";
    public static final String AUTH_LOGIN = AUTH_BASE + LOGIN;
    public static final String AUTH_LOGOUT = AUTH_BASE + LOGOUT;
    public static final String AUTH_REGISTER = AUTH_BASE + REGISTER;
    public static final String AUTH_ME = AUTH_BASE + ME;

    // --- Forms ---
    public static final String FORMS_BASE = "/forms";
    public static final String FORMS_PUBLISHED = FORMS_BASE + "/published-list";
    public static final String FORMS_RESTORE_ID = FORMS_BASE + RESTORE + "/{id}";
    public static final String FORMS_LOOKUP_ABS = FORMS_BASE + LOOKUP;

    // --- Runtime (Public) ---
    public static final String RUNTIME_BASE = "/runtime/forms";
    public static final String RUNTIME_SUBMISSIONS = "/submissions";
    public static final String DRAFT_PATH = "/{formCode}/submissions/draft";
    public static final String SUBMIT_PATH = "/{formCode}/submissions/submit";

    // --- Dashboard ---
    public static final String DASHBOARD_BASE = "/dashboard";
    public static final String DASHBOARD_STATS = "/stats";

    // --- Submissions ---
    public static final String SUBMISSIONS_BASE = "/submissions";

    private ApiEndpoints() {
        // Prevent instantiation
    }
}
