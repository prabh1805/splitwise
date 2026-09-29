package com.prabh.splitwise.usergroup.util;

import java.util.Locale;

public final class EmailNormalizer {
    private EmailNormalizer() {}
    public static String normalize(String raw){
        return raw.trim().toLowerCase(Locale.ROOT);
    }
}
