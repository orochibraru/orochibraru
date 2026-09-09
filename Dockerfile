FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY *.html style.css robots.txt sitemap.xml /usr/share/nginx/html/
EXPOSE 80
