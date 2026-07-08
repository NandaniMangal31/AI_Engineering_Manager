import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Centralized place to handle cross-cutting API error concerns (auth
 * redirects on 401, toast notifications, logging to an error tracker,
 * etc). Individual services/components still handle their own loading
 * and error signals; this just gives one place to hook global behavior.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err) => {
      // TODO: hook up global error reporting / auth redirect here
      console.error(`[API error] ${req.method} ${req.url}`, err);
      return throwError(() => err);
    })
  );
