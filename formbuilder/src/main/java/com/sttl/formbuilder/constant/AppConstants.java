package com.sttl.formbuilder.constant;

public class AppConstants {

    // --- Regex Patterns ---
    public static final String REGEX_EMAIL = "^[\\w.+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$";
    public static final String REGEX_USERNAME = "^[a-zA-Z0-9_]{3,50}$";
    public static final String REGEX_PASSWORD = "^(?=.*[A-Za-z])(?=.*\\d).{6,}$";
    public static final String REGEX_FORM_NAME = "^[\\w\\s\\-()\\.,!?&]{3,150}$";
    public static final String REGEX_ROLE_NAME = "^[A-Z0-9_]{2,80}$";
    public static final String REGEX_SLUG = "^[a-z0-9]+(?:-[a-z0-9]+)*$";
    public static final String REGEX_NUMERIC = "^\\d+$";
    public static final String REGEX_PHONE = "^\\+\\d{1,4}\\d{10}$";

    // --- Date Formats ---
    public static final String DATE_FORMAT = "yyyy-MM-dd";
    public static final String DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";

    // --- Pagination Defaults ---
    public static final String DEFAULT_PAGE_NUMBER = "0";
    public static final String DEFAULT_PAGE_SIZE = "10";
    public static final String DEFAULT_SORT_BY = "createdAt";
    public static final String DEFAULT_SORT_DIRECTION = "desc";

    private AppConstants() {
        // Prevent instantiation
    }
}
