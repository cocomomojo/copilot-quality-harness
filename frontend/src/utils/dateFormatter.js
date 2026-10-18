/* copilot-generated */

/**
 * Checks if a date string is valid
 * @param {string|null|undefined} dateString - The date string to validate
 * @returns {boolean} - True if the date string is valid
 */
export function isValidDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Checks if a date value is null or undefined
 * @param {string|null|undefined} createdAt - The created_at value
 * @returns {boolean} - True if the date is null or undefined
 */
function isNullOrUndefinedDate(createdAt) {
  return createdAt === null || createdAt === undefined;
}

/**
 * Formats an account creation date based on locale
 * @param {string|null|undefined} createdAt - ISO 8601 formatted date string
 * @param {string} locale - Locale code (e.g., 'ja-JP', 'en-US')
 * @param {string} timezone - Timezone (e.g., 'Asia/Tokyo')
 * @returns {Object} - Object with success flag and formatted_date
 */
export function formatAccountCreatedDate(createdAt, locale = 'ja-JP', timezone = 'Asia/Tokyo') {
  try {
    // Handle null/undefined first
    if (isNullOrUndefinedDate(createdAt)) {
      if (createdAt === undefined) {
        return { success: true, formatted_date: '未設定' };
      }
      return { success: true, formatted_date: '-' };
    }

    // Handle empty string
    if (createdAt === '') {
      return { success: true, formatted_date: '未設定' };
    }

    // Check if the date string is valid
    if (!isValidDate(createdAt)) {
      return { success: true, formatted_date: '-' };
    }

    const date = new Date(createdAt);

    // Use Intl.DateTimeFormat for both locales to respect timezone parameter
    if (locale === 'ja-JP') {
      // Japanese format: YYYY年M月D日
      const options = { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: timezone };
      const formatter = new Intl.DateTimeFormat('ja-JP', options);
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      return { success: true, formatted_date: `${year}年${month}月${day}日` };
    } else if (locale === 'en-US') {
      // English format: Month D, YYYY (e.g., October 18, 2026)
      const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      return { success: true, formatted_date: formatter.format(date) };
    }

    // Default fallback to ISO string
    return { success: true, formatted_date: createdAt };
  } catch (error) {
    return { success: true, formatted_date: '-' };
  }
}

/**
 * Fetches user profile from the API
 * @returns {Promise<Object>} - User profile data or error
 */
export async function fetchUserProfile() {
  try {
    const response = await fetch('/api/user/me');
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error_code: 'USER_NOT_FOUND', error_message: 'User not found' };
      }
      return { success: false, error_code: 'FETCH_USER_FAILED', error_message: 'ユーザープロフィール取得に失敗しました' };
    }
    const data = await response.json();
    return {
      success: true,
      user_id: data.id,
      email: data.email,
      created_at: data.created_at
    };
  } catch (error) {
    return { success: false, error_code: 'FETCH_USER_FAILED', error_message: 'ユーザープロフィール取得に失敗しました' };
  }
}
