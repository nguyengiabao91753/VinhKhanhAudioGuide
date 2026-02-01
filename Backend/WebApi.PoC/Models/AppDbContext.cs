using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace WebApi.PoC.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<pois> pois { get; set; }

    public virtual DbSet<pois_localizedData> pois_localizedData { get; set; }

    public virtual DbSet<position> position { get; set; }

    public virtual DbSet<tour> tour { get; set; }

    public virtual DbSet<tour_points> tour_points { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<pois>(entity =>
        {
            entity.HasKey(e => e._id).HasName("PK__pois__DED88B1CD4B75534");

            entity.Property(e => e._id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.banner)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.thumbnail)
                .HasMaxLength(500)
                .IsUnicode(false);

            entity.HasOne(d => d.position).WithMany(p => p.pois)
                .HasForeignKey(d => d.position_id)
                .HasConstraintName("FK_pois_position");
        });

        modelBuilder.Entity<pois_localizedData>(entity =>
        {
            entity.HasKey(e => new { e.pois_id, e.lang_code });

            entity.Property(e => e.lang_code)
                .HasMaxLength(10)
                .IsUnicode(false);
            entity.Property(e => e.description_audio)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.description_text)
                .HasMaxLength(500)
                .IsUnicode(false);
            entity.Property(e => e.name)
                .HasMaxLength(255)
                .IsUnicode(false);

            entity.HasOne(d => d.pois).WithMany(p => p.pois_localizedData)
                .HasForeignKey(d => d.pois_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_pois_localizedData_pois");
        });

        modelBuilder.Entity<position>(entity =>
        {
            entity.HasKey(e => e._id).HasName("PK__position__DED88B1CCC929C88");

            entity.Property(e => e._id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.type)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<tour>(entity =>
        {
            entity.HasKey(e => e._id).HasName("PK__tour__DED88B1C51C80232");

            entity.Property(e => e._id).HasDefaultValueSql("(newid())");
            entity.Property(e => e.name)
                .HasMaxLength(255)
                .IsUnicode(false);
        });

        modelBuilder.Entity<tour_points>(entity =>
        {
            entity.HasKey(e => e._id).HasName("PK__tour_poi__DED88B1C78A05AEF");

            entity.Property(e => e._id).HasDefaultValueSql("(newid())");

            entity.HasOne(d => d.id_tourNavigation).WithMany(p => p.tour_points)
                .HasForeignKey(d => d.id_tour)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_tour_points_tour");

            entity.HasOne(d => d.tour_point).WithMany(p => p.tour_points)
                .HasForeignKey(d => d.tour_point_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_tour_points_pois");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
