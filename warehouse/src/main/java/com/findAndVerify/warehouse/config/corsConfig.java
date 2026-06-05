package com.findAndVerify.warehouse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class corsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer(){
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry resgistry){
                resgistry.addMapping("/**").allowedOrigins("*").allowedMethods("GET","POST","PUT","DELTE","OPTIONS").allowedHeaders("*");
            }
        };
    }
    
}
