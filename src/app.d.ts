declare global {
	namespace App {
		interface Platform {
			env: {
				RESEND_API_KEY?: string;
				BOOKING_EMAIL?: string;
				BOOKING_FROM?: string;
			};
		}
	}

	/** Cloudflare Turnstile widget API (lazy-loaded in BookingForm, #31). */
	interface TurnstileApi {
		render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
		reset: (widgetId?: string) => void;
		remove: (widgetId?: string) => void;
	}

	interface Window {
		turnstile?: TurnstileApi;
	}
}

export {};